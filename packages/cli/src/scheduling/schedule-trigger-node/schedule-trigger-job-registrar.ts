import { Logger } from '@n8n/backend-common';
import { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Schedule } from '@n8n/scheduler';
import { computeFirstRunAt } from '@n8n/scheduler';
import type { Cron, INode, SchedulingFunctions, Workflow } from 'n8n-workflow';
import { SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { DurableJobProvisioner } from '../durable-job-provisioner';
import type { ScheduleTriggerTaskPayload } from './schedule-trigger-task';
import { SCHEDULE_TRIGGER_TASK_TYPE } from './schedule-trigger-task';

/** One rule of a Schedule Trigger node, ready to persist as a durable job. */
interface CollectedSchedule {
	schedule: Schedule;
	/**
	 * The first fire, computed ungated at collect time: the legacy engine always
	 * fires a fresh rule at its next instant, and every later fire chains from this
	 * anchor through the materializer. `null` for a degenerate rule the legacy
	 * engine would never fire (see {@link isDegenerateRecurrence}).
	 */
	firstRunAt: Date | null;
}

/**
 * Registers a Schedule Trigger node's rules as durable `scheduled_job` rows —
 * the publication activation path's counterpart to the in-memory
 * `ScheduledTaskManager`, chosen per instance by `N8N_SCHEDULER_ENABLED`.
 *
 * The node stays engine-agnostic: during activation its `trigger()` runs
 * unchanged and calls `registerCron` as always, but the execution context hands
 * it this service's collector instead of the in-memory registrar. Collection is
 * synchronous (`registerCron` returns `void`), so the rules are persisted right
 * after the node finishes registering, by {@link commit}.
 *
 * Each rule is stored under the best-fitting scheduler kind (see
 * {@link toSchedule}): a fixed second/minute cadence as `interval`, an
 * every-Nth-period calendar cadence as `recurring_cron`, and everything else
 * (including a raw cron field) as plain `cron`.
 *
 * Committing provisions the node's jobs in place rather than rewriting them
 * wholesale: a job whose definition is unchanged keeps its row — its id anchors
 * the `(jobId, scheduledFor)` task
 * identity and the execution dedup key, so re-activation (a re-published
 * version, a leader takeover replaying active workflows) cannot double-fire
 * instants already queued or run. Only a changed rule restarts its clock, and
 * its still-pending occurrences are withdrawn with it.
 *
 * Durable jobs track the *published* state of a workflow, not this instance's
 * leadership: rows are written on activation and deleted on deactivation
 * ({@link remove}) or by FK cascade when the published version goes away —
 * never on leader stepdown or shutdown, which tear down only in-memory state.
 */
@Service()
export class ScheduleTriggerJobRegistrar {
	/** Rules collected from a node's `trigger()` run, awaiting {@link commit}. */
	private readonly pending = new Map<string, CollectedSchedule[]>();

	private readonly intercepting: boolean;

	private readonly defaultTimezone: string;

	/** How a fixed second/minute interval is represented (see `SchedulerConfig`). */
	private readonly triggerNodeMode: 'legacy' | 'new';

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		workflowsConfig: WorkflowsConfig,
		private readonly jobProvisioner: DurableJobProvisioner,
	) {
		// The durable engine only takes over on the publication activation path;
		// the legacy ActiveWorkflowManager keeps its in-memory timers untouched.
		this.intercepting =
			globalConfig.scheduler.enabled && workflowsConfig.useWorkflowPublicationService;
		this.defaultTimezone = globalConfig.generic.timezone;
		this.triggerNodeMode = globalConfig.scheduler.triggerNodeMode;
		this.logger = this.logger.scoped('scheduler');
	}

	/** Whether this node's cron registrations should divert to durable jobs. */
	interceptsNode(node: INode): boolean {
		return this.intercepting && node.type === SCHEDULE_TRIGGER_NODE_TYPE;
	}

	/**
	 * The scheduling functions handed to an intercepted node's trigger context.
	 * Each `registerCron` call picks the rule's kind and plans its first fire
	 * synchronously — an invalid cron expression throws right there, inside the
	 * node's own error handling, exactly as the in-memory registrar would.
	 * Creating a collector replaces any half-collected rules from a previous
	 * failed attempt for the same node.
	 */
	createCollector(workflow: Workflow, node: INode): SchedulingFunctions {
		const timezone = explicitTimezone(workflow);
		const collected: CollectedSchedule[] = [];
		this.pending.set(pendingKey(workflow.id, node.id), collected);

		return {
			registerCron: ({ expression, recurrence, source }: Cron) => {
				const schedule = this.toSchedule(expression, timezone, recurrence, source);

				if (isDegenerateRecurrence(recurrence)) {
					// The legacy engine never fires such a rule (its recurrence check
					// rejects every tick), so mirror that as a job with no next run
					// instead of failing an activation that used to succeed. No first
					// run to compute: the row is stored clock-dead and never claimed.
					this.logger.warn(
						'Schedule trigger rule has a non-positive recurrence interval; it will never fire',
						{ workflowId: workflow.id, nodeId: node.id },
					);
					collected.push({ schedule, firstRunAt: null });
					return;
				}

				// Validates the expression/timezone and returns the first instant. A null
				// (instance-default) timezone is resolved for the math while staying null
				// in the stored row. `computeFirstRunAt` throws on a malformed rule.
				const computed = computeFirstRunAt(
					withResolvedTimezone(schedule, this.defaultTimezone),
					new Date(),
				);

				collected.push({ schedule, firstRunAt: computed });
			},
		};
	}

	/**
	 * Pick the best-fitting scheduler kind for one rule.
	 *
	 * - A second/minute cadence becomes an `interval` job in `new` mode (a steady
	 *   elapsed-time cadence); in `legacy` mode it stays the node's plain cron so
	 *   fires remain clock-aligned.
	 * - An every-Nth-period calendar cadence (`recurrence.activated`, stride ≥ 2)
	 *   becomes a `recurring_cron` job: the node's cron anchor plus the gate.
	 * - Everything else — a stride-1 calendar cadence and a raw cron field — is a
	 *   plain `cron` job.
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
	 * Persist the rules collected for one node, reconciling them against the
	 * node's existing jobs (see the class doc for why unchanged jobs must keep
	 * their rows). A no-op when nothing was collected — the node wasn't
	 * intercepted. Consumes the pending rules either way.
	 */
	async commit(workflowId: string, nodeId: string): Promise<void> {
		const key = pendingKey(workflowId, nodeId);
		const collected = this.pending.get(key);
		if (collected === undefined) return;
		this.pending.delete(key);

		const desired = collected.map(({ schedule, firstRunAt }, ruleIndex) => ({
			name: `${workflowId}:${nodeId}:${ruleIndex}`,
			schedule,
			firstRunAt,
		}));

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

	/** Drop collected-but-uncommitted rules after a failed activation. */
	discard(workflowId: string, nodeId: string): void {
		this.pending.delete(pendingKey(workflowId, nodeId));
	}

	/**
	 * Delete the node's durable jobs on deactivation; their queued tasks cascade
	 * away. Inert while the durable engine is off, so the flag-off path never
	 * touches the database.
	 */
	async remove(workflowId: string, nodeId: string): Promise<void> {
		if (!this.intercepting) return;
		await this.jobProvisioner.deprovision(workflowId, nodeId);
	}
}

const pendingKey = (workflowId: string, nodeId: string): string => `${workflowId}:${nodeId}`;

/**
 * The workflow's own timezone setting, or `null` for "instance default" —
 * stored unresolved so a later change of the instance default reaches the
 * schedule without a re-publication.
 */
function explicitTimezone(workflow: Workflow): string | null {
	const timezone = workflow.settings?.timezone;
	return typeof timezone === 'string' && timezone !== '' && timezone !== 'DEFAULT'
		? timezone
		: null;
}

/**
 * A rule the legacy recurrence check treats as clock-dead: an activated gate
 * whose interval size is falsy (`0`/`NaN`), which `recurrenceCheck` rejects on
 * every tick via `if (!intervalSize) return false`. A negative size is *not*
 * degenerate — legacy fires it on every candidate tick, so it falls through to
 * the plain-cron representation (`intervalSize >= 2` in {@link toSchedule} is
 * likewise false, so it never becomes a `recurring_cron` gate).
 */
function isDegenerateRecurrence(recurrence: Cron['recurrence']): boolean {
	return recurrence?.activated === true && !recurrence.intervalSize;
}

/** Resolve a null (instance-default) cron timezone for the recurrence math only. */
function withResolvedTimezone(schedule: Schedule, defaultTimezone: string): Schedule {
	if (schedule.kind === 'cron' || schedule.kind === 'recurring_cron') {
		return { ...schedule, timezone: schedule.timezone ?? defaultTimezone };
	}
	return schedule;
}
