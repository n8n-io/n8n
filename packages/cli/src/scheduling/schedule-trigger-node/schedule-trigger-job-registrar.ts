import { Logger } from '@n8n/backend-common';
import { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Schedule } from '@n8n/scheduler';
import { computeFirstRunAt, scheduleFingerprint, validateSchedule } from '@n8n/scheduler';
import type { Cron, INode, SchedulingFunctions, Workflow } from 'n8n-workflow';
import { SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { DurableJobProvisioner } from '../durable-job-provisioner';
import type { ScheduleTriggerTaskPayload } from './schedule-trigger-task';
import { SCHEDULE_TRIGGER_TASK_TYPE } from './schedule-trigger-task';

/** One rule of a Schedule Trigger node, ready to persist as a durable job. */
interface CollectedSchedule {
	/** The rule's cadence, already mapped to its scheduler kind (see {@link ScheduleTriggerJobRegistrar.toSchedule}). */
	schedule: Schedule;
	/**
	 * The first fire, computed ungated at collect time:
	 * the legacy engine always fires a fresh rule at its next instant,
	 * and every later fire chains from this anchor through the materializer.
	 * `null` for a degenerate rule the legacy engine would never fire (see {@link isDegenerateRecurrence}).
	 */
	firstRunAt: Date | null;
}

/**
 * One activation attempt's rule collection, from {@link ScheduleTriggerJobRegistrar.createSession}.
 *
 * Scoped to the attempt on purpose: rules collected here can only be committed
 * or discarded through this same session, so two activations racing on the
 * same workflow and node (possible on the legacy path, which has no lifecycle
 * lock) can never consume each other's half-collected rules.
 */
export interface ScheduleTriggerCollectionSession {
	/**
	 * The scheduling functions handed to an intercepted node's trigger context.
	 * Each `registerCron` call picks the rule's kind and plans its first fire synchronously.
	 *
	 * Creating a collector replaces any half-collected rules from a previous
	 * failed attempt for the same node within this session.
	 *
	 * @param workflow The activating workflow, read for its id and timezone setting.
	 * @param node The Schedule Trigger node whose rules are being collected.
	 * @returns Scheduling functions whose `registerCron` collects rules for {@link commit}.
	 */
	createCollector(workflow: Workflow, node: INode): SchedulingFunctions;

	/**
	 * Persist the rules this session collected for one node, reconciling them
	 * against the node's existing jobs (see {@link ScheduleTriggerJobRegistrar}
	 * for why unchanged jobs must keep their rows).
	 *
	 * @param workflowId The activating workflow whose collected rules to persist.
	 * @param nodeId The Schedule Trigger node those rules belong to.
	 */
	commit(workflowId: string, nodeId: string): Promise<void>;

	/**
	 * Drop this session's collected-but-uncommitted rules after a failed activation.
	 *
	 * @param workflowId The workflow whose pending rules to discard.
	 * @param nodeId The Schedule Trigger node those rules belong to.
	 */
	discard(workflowId: string, nodeId: string): void;
}

/**
 * Registers a Schedule Trigger node's rules as durable `scheduled_job` rows.
 * The publication activation path's counterpart to the in-memory `ScheduledTaskManager`.
 *
 * Each activation attempt works through its own {@link ScheduleTriggerCollectionSession}:
 * collection is synchronous, so the rules are persisted right after the node
 * finishes registering, by the session's `commit`.
 *
 * Each rule is stored under the best-fitting scheduler kind (see {@link toSchedule}):
 * - a fixed second/minute cadence as `interval`
 * - an every-Nth-period calendar cadence as `recurring_cron`
 * - and everything else (including a raw cron field) as plain `cron`.
 *
 * Committing provisions the node's jobs in place rather than rewriting them wholesale:
 * - a job whose definition is unchanged keeps its row
 * - its id anchors the `(jobId, scheduledFor)` task identity and the execution dedup key,
 * 	 so re-activation cannot double-fire instants already queued or run.
 * - only a changed rule restarts its clock, and its still-pending occurrences are withdrawn with it.
 *
 * Durable jobs track the *published* state of a workflow, not this instance's leadership:
 * rows are written on activation and deleted on deactivation ({@link remove})
 * or by FK cascade when the published version goes away;
 * never on leader stepdown or shutdown, which tear down only in-memory state.
 */
@Service()
export class ScheduleTriggerJobRegistrar {
	/** Whether this instance diverts schedule trigger registrations to durable jobs. */
	private readonly intercepting: boolean;

	/** Instance-default timezone, used to resolve a null cron timezone for the first-run math only. */
	private readonly defaultTimezone: string;

	/** How a fixed second/minute interval is represented (see `SchedulerConfig`). */
	private readonly triggerNodeMode: 'legacy' | 'new';

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		workflowsConfig: WorkflowsConfig,
		private readonly jobProvisioner: DurableJobProvisioner,
	) {
		this.intercepting =
			globalConfig.scheduler.enabled && workflowsConfig.useWorkflowPublicationService;
		this.defaultTimezone = globalConfig.generic.timezone;
		this.triggerNodeMode = globalConfig.scheduler.triggerNodeMode;
		this.logger = this.logger.scoped('scheduler');

		if (globalConfig.scheduler.enabled && !workflowsConfig.useWorkflowPublicationService) {
			this.logger.warn(
				'N8N_SCHEDULER_ENABLED is set but the workflow publication service is disabled. The durable scheduler cannot take over schedule triggers, which keep using the legacy in-memory engine.',
			);
		}
	}

	/**
	 * @param node The trigger node about to register its cron rules.
	 * @returns `true` to hand the node a durable collector, `false` to leave it on the legacy path.
	 */
	interceptsNode(node: INode): boolean {
		return this.intercepting && node.type === SCHEDULE_TRIGGER_NODE_TYPE;
	}

	/**
	 * A rule-collection session for one activation attempt.
	 *
	 * The session is the only holder of the rules it collects, so a concurrent
	 * attempt for the same workflow and node (its own session) cannot commit or
	 * discard them. See {@link ScheduleTriggerCollectionSession}.
	 */
	createSession(): ScheduleTriggerCollectionSession {
		/**
		 * Rules collected from a node's `trigger()` run, awaiting commit, keyed by
		 * {@link pendingKey}. An entry exists only between `createCollector` and
		 * the `commit`/`discard` that consumes it.
		 */
		const pending = new Map<string, CollectedSchedule[]>();

		return {
			createCollector: (workflow: Workflow, node: INode): SchedulingFunctions => {
				const timezone = explicitTimezone(workflow);
				const collected: CollectedSchedule[] = [];
				pending.set(pendingKey(workflow.id, node.id), collected);

				return {
					registerCron: ({ expression, recurrence, source }: Cron) => {
						const schedule = this.toSchedule(expression, timezone, recurrence, source);

						if (isDegenerateRecurrence(recurrence)) {
							// The legacy engine never fires such a rule (its recurrence check
							// rejects every tick), so mirror that as a job with no next run
							// instead of failing an activation that used to succeed. The rule
							// must still be well-formed: the legacy engine parses the
							// expression/timezone at registration, before its recurrence check
							// ever runs, so a malformed rule fails activation regardless of
							// the gate. No first run to compute: the row is stored clock-dead
							// and never claimed.
							validateSchedule(schedule);

							this.logger.warn(
								'Schedule trigger rule has a non-positive recurrence interval; it will never fire',
								{ workflowId: workflow.id, nodeId: node.id },
							);
							collected.push({ schedule, firstRunAt: null });
						} else {
							// Validates the expression/timezone and returns the first instant.
							const computed = computeFirstRunAt(
								withResolvedTimezone(schedule, this.defaultTimezone),
								new Date(),
							);

							collected.push({ schedule, firstRunAt: computed });
						}
					},
				};
			},

			commit: async (workflowId: string, nodeId: string): Promise<void> => {
				const key = pendingKey(workflowId, nodeId);
				const collected = pending.get(key);
				if (collected !== undefined) {
					pending.delete(key);
					await this.provisionCollected(workflowId, nodeId, collected);
				}
			},

			discard: (workflowId: string, nodeId: string): void => {
				pending.delete(pendingKey(workflowId, nodeId));
			},
		};
	}

	/**
	 * Pick the best-fitting scheduler kind for one rule.
	 *
	 * - A second/minute cadence becomes an `interval` job in `new` mode (a steady
	 *   elapsed-time cadence); in `legacy` mode it stays the node's plain cron so
	 *   fires remain clock-aligned.
	 * - "Every N days/weeks/months" with N >= 2 becomes a `recurring_cron` job:
	 *   the cron expression names the candidate instants and the job fires on
	 *   every Nth of them.
	 * - Everything else — "every 1 day/week/month" and a raw cron field — is a
	 *   plain `cron` job.
	 *
	 * @param expression The node's cron expression (the anchor for calendar cadences).
	 * @param timezone The rule's timezone, or `null` for the instance default.
	 * @param recurrence The node's "every N periods" setting; `intervalSize` is that N.
	 * @param source Which field drove the cadence (`seconds`/`minutes`) and its size.
	 * @returns The chosen scheduler {@link Schedule} for this rule.
	 */
	private toSchedule(
		expression: Cron['expression'],
		timezone: string | null,
		recurrence: Cron['recurrence'],
		source: Cron['source'],
	): Schedule {
		if (
			this.triggerNodeMode === 'new' &&
			source?.size !== undefined &&
			(source.field === 'seconds' || source.field === 'minutes')
		) {
			const intervalSeconds = source.field === 'minutes' ? source.size * 60 : source.size;
			return { kind: 'interval', intervalSeconds };
		}

		// `intervalSize` is the N in the node's "every N days/weeks/months". Only
		// N >= 2 needs the recurring_cron wrapper: with N = 1 every candidate
		// instant fires, which the cron expression alone already expresses (the
		// engine rejects a recurrenceSize of 1 to keep one representation per
		// rule). N = 0/NaN never fires (see isDegenerateRecurrence) and a negative
		// N fires on every instant in the legacy engine; both are plain crons here.
		if (recurrence?.activated && recurrence.intervalSize >= 2) {
			return {
				kind: 'recurring_cron',
				cronExpression: expression,
				timezone,
				recurrenceUnit: recurrence.typeInterval,
				recurrenceSize: recurrence.intervalSize,
			};
		}

		return { kind: 'cron', cronExpression: expression, timezone };
	}

	/**
	 * Persist one node's collected rules, reconciling them against the node's
	 * existing jobs (see the class doc for why unchanged jobs must keep their rows).
	 *
	 * @param workflowId The activating workflow whose collected rules to persist.
	 * @param nodeId The Schedule Trigger node those rules belong to.
	 * @param collected The rules a session collected from the node's `trigger()` run.
	 */
	private async provisionCollected(
		workflowId: string,
		nodeId: string,
		collected: CollectedSchedule[],
	): Promise<void> {
		const seen = new Map<string, number>();
		const desired = collected.map(({ schedule, firstRunAt }) => {
			const fingerprint = scheduleFingerprint(schedule, firstRunAt !== null);
			const occurrence = seen.get(fingerprint) ?? 0;
			seen.set(fingerprint, occurrence + 1);
			return {
				name: `${workflowId}:${nodeId}:${fingerprint}:${occurrence}`,
				schedule,
				firstRunAt,
			};
		});

		const payload: ScheduleTriggerTaskPayload = { workflowId, nodeId };
		const summary = await this.jobProvisioner.provision(
			workflowId,
			nodeId,
			SCHEDULE_TRIGGER_TASK_TYPE,
			{ ...payload },
			desired,
		);

		this.logger.debug('Provisioned durable schedules for trigger node', {
			workflowId,
			nodeId,
			inserted: summary.inserted.length,
			redefined: summary.redefined.length,
			unchanged: summary.unchanged.length,
			removed: summary.removed.length,
		});
	}

	/**
	 * Delete the node's durable jobs on deactivation; their queued tasks cascade
	 * away. Runs regardless of the current interception state: an earlier
	 * activation may have persisted rows while the durable engine was on, and
	 * leaving them behind would re-fire the node if durability is later
	 * re-enabled. Deprovision is a no-op when no such rows exist.
	 *
	 * @param workflowId The deactivating workflow whose durable jobs to delete.
	 * @param nodeId The Schedule Trigger node those jobs belong to.
	 */
	async remove(workflowId: string, nodeId: string): Promise<void> {
		await this.jobProvisioner.deprovision(workflowId, nodeId);
	}

	/**
	 * Delete every durable job the workflow's Schedule Trigger nodes committed;
	 * their queued tasks cascade away. The whole-workflow counterpart to
	 * {@link remove}, for deactivation paths that tear down all of a workflow's
	 * triggers at once. Keyed by the workflow alone, not by the node ids
	 * registered in memory, so a deactivation retried after a failure still finds
	 * the rows once the in-memory registration is gone. Like {@link remove}, runs
	 * regardless of the current interception state.
	 *
	 * @param workflowId The deactivating workflow whose durable jobs to delete.
	 */
	async removeWorkflow(workflowId: string): Promise<void> {
		await this.jobProvisioner.deprovisionWorkflow(workflowId, SCHEDULE_TRIGGER_TASK_TYPE);
	}

	/**
	 * Delete the workflow's durable jobs within a caller-owned transaction, so a
	 * publication deactivation commits their removal atomically with its
	 * `active = false` write instead of routing through the leader. Durable rows
	 * are DB state: their removal must not depend on a leader hand-off landing,
	 * or a lost one leaves jobs firing a workflow already marked inactive. Keyed
	 * and idempotent like {@link removeWorkflow}, so the leader's later
	 * per-node teardown finds nothing left to do.
	 *
	 * @param manager The transaction the caller's deactivation writes run in.
	 * @param workflowId The deactivating workflow whose durable jobs to delete.
	 */
	async removeWorkflowInTransaction(manager: EntityManager, workflowId: string): Promise<void> {
		await this.jobProvisioner.deprovisionWorkflowInTransaction(
			manager,
			workflowId,
			SCHEDULE_TRIGGER_TASK_TYPE,
		);
	}
}

const pendingKey = (workflowId: string, nodeId: string): string => `${workflowId}:${nodeId}`;

function explicitTimezone(workflow: Workflow): string | null {
	const timezone = workflow.settings?.timezone;
	return typeof timezone === 'string' && timezone !== '' && timezone !== 'DEFAULT'
		? timezone
		: null;
}

/**
 * True for a rule that can never fire: recurrence is activated but its
 * interval size is `0` or `NaN`. For such a rule the legacy engine's
 * `recurrenceCheck` returns false on every tick (`if (!intervalSize) return
 * false`), so it never runs.
 *
 * A *negative* interval size is not degenerate: the legacy engine fires it on
 * every tick, and {@link toSchedule} matches that by mapping it to a plain
 * cron job (it also fails the `intervalSize >= 2` check there).
 */
function isDegenerateRecurrence(recurrence: Cron['recurrence']): boolean {
	return recurrence?.activated === true && !recurrence.intervalSize;
}

function withResolvedTimezone(schedule: Schedule, defaultTimezone: string): Schedule {
	if (schedule.kind === 'cron' || schedule.kind === 'recurring_cron') {
		return { ...schedule, timezone: schedule.timezone ?? defaultTimezone };
	}
	return schedule;
}
