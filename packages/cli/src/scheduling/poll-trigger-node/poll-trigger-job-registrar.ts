import { Logger } from '@n8n/backend-common';
import { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import { computeFirstRunAt, cronToSchedule } from '@n8n/scheduler';
import { PollJobManager } from 'n8n-core';
import type { INode, TriggerTime } from 'n8n-workflow';
import { triggerTimeToCron } from 'n8n-workflow';

import { DurableJobProvisioner } from '../durable-job-provisioner';
import type { PollTriggerTaskPayload } from './poll-trigger-task';
import { POLL_TRIGGER_TASK_TYPE } from './poll-trigger-task';

/**
 * Registers a Poll Trigger node's poll times as durable `scheduled_job` rows:
 * the publication path's counterpart to the in-memory `ScheduledTaskManager`,
 * and the concrete backing for core's {@link PollJobManager} port.
 *
 * A sibling of {@link import('../schedule-trigger-node/schedule-trigger-job-registrar').ScheduleTriggerJobRegistrar}:
 * each poll time maps to a scheduler `Schedule` through the same
 * {@link cronToSchedule} the Schedule Trigger uses, and both persist through
 * {@link DurableJobProvisioner.provisionForNode}, which derives a definition-stable
 * job name so an unchanged poll time keeps its row and clock across re-activation.
 * The poll node has no source/recurrence UI beyond a fixed cadence, so its
 * {@link triggerTimeToCron} mapping is simpler than the Schedule Trigger's.
 *
 * Payload is just `{ workflowId, nodeId }`; the handler re-runs `poll()` each
 * fire, so there is no per-occurrence dedup key.
 */
@Service()
export class PollTriggerJobRegistrar extends PollJobManager {
	/** Durable scheduler + publication both on: the base gate for durable dispatch. */
	private readonly intercepting: boolean;

	/** The poll opt-in on top of {@link intercepting}. */
	private readonly durablePollTriggers: boolean;

	/** Instance-default timezone, used to resolve the `'DEFAULT'`/empty sentinel. */
	private readonly defaultTimezone: string;

	/** How a fixed second/minute cadence is represented (shared with the Schedule Trigger). */
	private readonly triggerNodeMode: 'legacy' | 'new';

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		workflowsConfig: WorkflowsConfig,
		private readonly jobProvisioner: DurableJobProvisioner,
	) {
		super();
		this.intercepting =
			globalConfig.scheduler.enabled && workflowsConfig.useWorkflowPublicationService;
		this.durablePollTriggers = globalConfig.scheduler.durablePollTriggers;
		this.defaultTimezone = globalConfig.generic.timezone;
		this.triggerNodeMode = globalConfig.scheduler.triggerNodeMode;
		this.logger = this.logger.scoped('scheduler');

		if (globalConfig.scheduler.enabled && !workflowsConfig.useWorkflowPublicationService) {
			this.logger.warn(
				'N8N_SCHEDULER_ENABLED is set but the workflow publication service is disabled. The durable scheduler cannot take over poll triggers, which keep using the legacy in-memory engine.',
			);
		}
	}

	// The run side is gated where the scheduler loops start, not on instanceType here.
	isActive(): boolean {
		return this.intercepting && this.durablePollTriggers;
	}

	/** Persist a poll node's poll times as durable jobs, reconciled in place. */
	async register(
		workflowId: string,
		node: INode,
		pollTimes: TriggerTime[],
		timezone: string,
	): Promise<{ inserted: boolean }> {
		const resolvedTimezone = resolveTimezone(timezone, this.defaultTimezone);
		const seed = `${workflowId}:${node.id}`;

		const schedules = pollTimes.map((item) => {
			const schedule = cronToSchedule(
				triggerTimeToCron(item, seed),
				resolvedTimezone,
				this.triggerNodeMode,
			);
			// `computeFirstRunAt` validates the expression/timezone, throwing on a
			// malformed rule like the legacy engine's parse-at-registration.
			const firstRunAt = computeFirstRunAt(schedule, new Date());
			return { schedule, firstRunAt };
		});

		const payload: PollTriggerTaskPayload = { workflowId, nodeId: node.id };
		const summary = await this.jobProvisioner.provisionForNode(
			workflowId,
			node.id,
			POLL_TRIGGER_TASK_TYPE,
			{ ...payload },
			schedules,
		);

		this.logger.debug('Provisioned durable poll jobs for trigger node', {
			workflowId,
			nodeId: node.id,
			inserted: summary.inserted.length,
			redefined: summary.redefined.length,
			unchanged: summary.unchanged.length,
			removed: summary.removed.length,
		});

		return { inserted: summary.inserted.length > 0 };
	}

	/** Delete the node's durable poll jobs on deactivation. No-op when none exist. */
	async remove(workflowId: string, nodeId: string): Promise<void> {
		await this.jobProvisioner.deprovision(workflowId, nodeId);
	}

	/**
	 * Delete every durable poll job for the workflow, keyed by workflow alone so a
	 * deactivation retried after in-memory state is gone still finds the rows. No-op
	 * when none exist, so it is safe on the legacy deactivation paths too.
	 */
	async removeWorkflow(workflowId: string): Promise<void> {
		await this.jobProvisioner.deprovisionWorkflow(workflowId, POLL_TRIGGER_TASK_TYPE);
	}

	/**
	 * Delete the workflow's durable poll jobs within a caller-owned transaction, so
	 * a publication deactivation commits their removal atomically with its
	 * `active = false` write. Durable rows are DB state: a removal deferred to a
	 * later step could be lost, leaving jobs firing an inactive workflow. Keyed and
	 * idempotent like {@link removeWorkflow}.
	 */
	async removeWorkflowInTransaction(manager: EntityManager, workflowId: string): Promise<void> {
		await this.jobProvisioner.deprovisionWorkflowInTransaction(
			manager,
			workflowId,
			POLL_TRIGGER_TASK_TYPE,
		);
	}
}

/**
 * Resolve `workflow.timezone` to a concrete IANA zone. The `'DEFAULT'` sentinel
 * and empty string (no override) would fail `validateCron`, but the legacy engine
 * tolerated them, so fall back to the instance default.
 */
function resolveTimezone(timezone: string, defaultTimezone: string): string {
	return !timezone || timezone === 'DEFAULT' ? defaultTimezone : timezone;
}
