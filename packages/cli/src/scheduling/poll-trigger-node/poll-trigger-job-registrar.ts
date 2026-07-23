import { Logger } from '@n8n/backend-common';
import { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import type { DesiredJob, Schedule } from '@n8n/scheduler';
import { computeFirstRunAt, scheduleFingerprint } from '@n8n/scheduler';
import { createHash } from 'node:crypto';
import { PollJobManager } from 'n8n-core';
import type { CronExpression, INode, TriggerTime } from 'n8n-workflow';

import { DurableJobProvisioner } from '../durable-job-provisioner';
import type { PollTriggerTaskPayload } from './poll-trigger-task';
import { POLL_TRIGGER_TASK_TYPE } from './poll-trigger-task';

/**
 * Registers a Poll Trigger node's poll times as durable `scheduled_job` rows:
 * the publication path's counterpart to the in-memory `ScheduledTaskManager`,
 * and the concrete backing for core's {@link PollJobManager} port.
 *
 * Every poll time is a plain `cron` job (poll triggers only ever have a fixed
 * cadence). Jobs reconcile in place by a definition-derived name, so an
 * unchanged poll time keeps its row and clock across re-activation. To make that
 * hold, the seconds field is seeded deterministically from the node identity
 * (see {@link seededCron}) rather than randomised per activation. Payload is just
 * `{ workflowId, nodeId }`; the handler re-runs `poll()` each fire, so there is
 * no per-occurrence dedup key.
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

	/**
	 * Persist a poll node's poll times as durable jobs, reconciled in place.
	 * Returns whether a job was newly inserted, so the caller can run the inline
	 * first poll for a fresh provision but skip it on a pure re-activation.
	 */
	async register(
		workflowId: string,
		node: INode,
		pollTimes: TriggerTime[],
		timezone: string,
	): Promise<{ inserted: boolean }> {
		const resolvedTimezone = resolveTimezone(timezone, this.defaultTimezone);
		const seed = `${workflowId}:${node.id}`;
		const desired = this.toDesiredJobs(workflowId, node, pollTimes, seed, resolvedTimezone);

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

		return { inserted: summary.inserted.length > 0 };
	}

	/**
	 * Map each poll time to a `cron` job in the node's resolved timezone, with its
	 * first fire computed ungated and a name stable across re-activation (see the
	 * class doc).
	 */
	private toDesiredJobs(
		workflowId: string,
		node: INode,
		pollTimes: TriggerTime[],
		seed: string,
		timezone: string,
	): DesiredJob[] {
		const seen = new Map<string, number>();
		return pollTimes.map((item): DesiredJob => {
			const schedule: Schedule = {
				kind: 'cron',
				cronExpression: seededCron(item, seed),
				timezone,
			};
			// `computeFirstRunAt` validates the expression/timezone, throwing on a
			// malformed rule like the legacy engine's parse-at-registration.
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
 * Deterministic integer in `[min, max)` from `seed`+`label`, used to fill the
 * unspecified parts of a generated poll time's cron (the second, and the minute
 * for every-N-hours). Seeding on `${workflowId}:${nodeId}` keeps the value stable
 * across re-activation, so the durable job's cron string, and therefore its
 * reconcile-in-place identity, does not move; different nodes still spread apart.
 */
function stableInt(seed: string, label: string, min: number, max: number): number {
	const hash = createHash('sha256').update(`${seed}:${label}`).digest();
	return min + (hash.readUInt32BE(0) % (max - min));
}

/**
 * Build a 6-field cron for a poll time. Generated cadences get a node-seeded
 * (not random) seconds field so the job identity is stable; a custom cron is
 * used as-is, widened from 5 to 6 fields when it omits seconds (the legacy cron
 * lib accepted 5-field, but the durable scheduler's validator requires 6).
 */
function seededCron(item: TriggerTime, seed: string): CronExpression {
	if (item.mode === 'custom') {
		const trimmed = item.cronExpression.trim();
		return (trimmed.split(/\s+/).length === 5 ? `0 ${trimmed}` : trimmed) as CronExpression;
	}

	const second = stableInt(seed, 'second', 0, 60);

	if (item.mode === 'everyMinute') return `${second} * * * * *`;
	if (item.mode === 'everyHour') return `${second} ${item.minute} * * * *`;
	if (item.mode === 'everyX') {
		if (item.unit === 'minutes') return `${second} */${item.value} * * * *`;
		const minute = stableInt(seed, 'minute', 0, 60);
		return `${second} ${minute} */${item.value} * * *`;
	}
	if (item.mode === 'everyDay') return `${second} ${item.minute} ${item.hour} * * *`;
	if (item.mode === 'everyWeek') return `${second} ${item.minute} ${item.hour} * * ${item.weekday}`;
	// everyMonth
	return `${second} ${item.minute} ${item.hour} ${item.dayOfMonth} * *`;
}
