import { Logger } from '@n8n/backend-common';
import { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import type { DesiredJob, Schedule } from '@n8n/scheduler';
import { computeFirstRunAt, scheduleFingerprint } from '@n8n/scheduler';
import { PollJobManager } from 'n8n-core';
import type { CronExpression, INode } from 'n8n-workflow';

import { DurableJobProvisioner } from '../durable-job-provisioner';
import type { PollTriggerTaskPayload } from './poll-trigger-task';
import { POLL_TRIGGER_TASK_TYPE } from './poll-trigger-task';

/**
 * Registers a Poll Trigger node's cron rules as durable `scheduled_job` rows:
 * the publication path's counterpart to the in-memory `ScheduledTaskManager`,
 * and the concrete backing for core's {@link PollJobManager} port.
 *
 * Every poll time is a plain `cron` job (poll triggers only ever have a fixed
 * cadence). Jobs reconcile in place by a definition-derived name, so an
 * unchanged poll time keeps its row and clock across re-activation. Payload is
 * just `{ workflowId, nodeId }`; the handler re-runs `poll()` each fire, so
 * there is no per-occurrence dedup key.
 */
@Service()
export class PollTriggerJobRegistrar extends PollJobManager {
	/** Durable scheduler + publication both on: the base gate for durable dispatch. */
	private readonly intercepting: boolean;

	/** The poll opt-in on top of {@link intercepting}. */
	private readonly durablePollTriggers: boolean;

	/** Instance-default timezone, used to resolve the `'DEFAULT'`/empty sentinel. */
	private readonly defaultTimezone: string;

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

	/** Persist a poll node's cron rules as durable jobs, reconciled in place. */
	async register(
		workflowId: string,
		node: INode,
		cronExpressions: CronExpression[],
		timezone: string,
	): Promise<void> {
		const desired = this.toDesiredJobs(workflowId, node, cronExpressions, timezone);
		await this.provisionCollected(workflowId, node, desired);
	}

	/**
	 * Map each cron expression to a `cron` job in the node's resolved timezone,
	 * with its first fire computed ungated and a name stable across re-activation
	 * (see the class doc).
	 */
	private toDesiredJobs(
		workflowId: string,
		node: INode,
		cronExpressions: CronExpression[],
		timezone: string,
	): DesiredJob[] {
		const resolvedTimezone = resolveTimezone(timezone, this.defaultTimezone);
		const seen = new Map<string, number>();
		return cronExpressions.map((expression): DesiredJob => {
			// `computeFirstRunAt` validates the expression/timezone, throwing on a
			// malformed rule like the legacy engine's parse-at-registration.
			const schedule: Schedule = {
				kind: 'cron',
				cronExpression: normaliseCronFieldCount(expression),
				timezone: resolvedTimezone,
			};
			const firstRunAt = computeFirstRunAt(schedule, new Date());
			const fingerprint = scheduleFingerprint(schedule, firstRunAt !== null);
			const occurrence = seen.get(fingerprint) ?? 0;
			seen.set(fingerprint, occurrence + 1);
			return {
				name: `${workflowId}:${node.id}:${fingerprint}:${occurrence}`,
				schedule,
				firstRunAt,
			};
		});
	}

	/** Persist the node's desired jobs, reconciling against its existing ones. */
	private async provisionCollected(
		workflowId: string,
		node: INode,
		desired: DesiredJob[],
	): Promise<void> {
		const payload: PollTriggerTaskPayload = { workflowId, nodeId: node.id };
		const summary = await this.jobProvisioner.provision(
			workflowId,
			node.id,
			POLL_TRIGGER_TASK_TYPE,
			{ ...payload },
			desired,
		);

		this.logger.debug('Provisioned durable poll jobs for trigger node', {
			workflowId,
			nodeId: node.id,
			inserted: summary.inserted.length,
			redefined: summary.redefined.length,
			unchanged: summary.unchanged.length,
			removed: summary.removed.length,
		});
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

/**
 * Prepend a `0` seconds field to a 5-field cron so it meets the durable
 * scheduler's 6-field requirement. Custom pollTimes can yield 5 fields, which the
 * legacy cron lib accepted but `validateCron` rejects. 6-field passes through.
 */
function normaliseCronFieldCount(expression: CronExpression): CronExpression {
	const trimmed = expression.trim();
	// Prepending a field widens `CronExpression` to `string`; the result is a valid
	// 6-field cron, so narrow it back here.
	return trimmed.split(/\s+/).length === 5 ? (`0 ${trimmed}` as CronExpression) : expression;
}
