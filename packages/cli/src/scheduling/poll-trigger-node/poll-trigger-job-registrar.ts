import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import type { DesiredJob, Schedule } from '@n8n/scheduler';
import { computeFirstRunAt } from '@n8n/scheduler';
import { PollJobManager } from 'n8n-core';
import type { CronExpression, INode, TriggerTime } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import { PollBackoffService } from '@/workflows/triggers/poll-backoff.service';

import { nameDesiredJobs } from '../desired-job-name';
import { DurableJobProvisioner } from '../durable-job-provisioner';
import { WorkflowScheduledJobOwner } from '../workflow-scheduled-job-owner';
import type { PollTriggerTaskPayload } from './poll-trigger-task';
import { POLL_TRIGGER_TASK_TYPE } from './poll-trigger-task';

/**
 * Concrete {@link PollJobManager}: registers a Poll Trigger node's poll times as
 * `scheduled_job` rows, each reconciled in place by a definition-derived name so an
 * unchanged poll time keeps its row and clock across re-activation.
 */
@Service()
export class PollTriggerJobRegistrar extends PollJobManager {
	/** Instance-default timezone, used to resolve the `'DEFAULT'`/empty sentinel. */
	private readonly defaultTimezone: string;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly jobProvisioner: DurableJobProvisioner,
		private readonly pollBackoffService: PollBackoffService,
		private readonly owner: WorkflowScheduledJobOwner,
	) {
		super();
		this.defaultTimezone = globalConfig.generic.timezone;
		this.logger = this.logger.scoped('scheduler');
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
		// Skip, not coalesce: a poll fetches everything new since it last ran, so
		// replaying missed polls would just repeat the same fetch.
		const summary = await this.jobProvisioner.provision({
			owner: this.owner.member(workflowId, node.id),
			taskType: POLL_TRIGGER_TASK_TYPE,
			payload: { ...payload },
			desired,
			misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		});

		this.logger.debug('Provisioned scheduler jobs for poll trigger node', {
			workflowId,
			nodeId: node.id,
			inserted: summary.inserted.length,
			redefined: summary.redefined.length,
			unchanged: summary.unchanged.length,
			removed: summary.removed.length,
		});

		const inserted = summary.inserted.length > 0;
		if (inserted) {
			await this.pollBackoffService.reset(workflowId, node.id);
		}

		return { inserted };
	}

	/**
	 * Map each poll time to a `cron` job in the resolved timezone, with a name
	 * stable across re-activation (see the class doc).
	 */
	private toDesiredJobs(
		workflowId: string,
		node: INode,
		pollTimes: TriggerTime[],
		seed: string,
		timezone: string,
	): DesiredJob[] {
		return nameDesiredJobs(
			workflowId,
			node.id,
			pollTimes.map((item) => {
				const schedule: Schedule = {
					kind: 'cron',
					cronExpression: seededCron(item, seed),
					timezone,
				};
				// `computeFirstRunAt` validates the expression/timezone, throwing on a
				// malformed rule.
				return { schedule, firstRunAt: computeFirstRunAt(schedule, new Date()) };
			}),
		);
	}

	/** Delete the node's poll jobs on deactivation. No-op when none exist. */
	async remove(workflowId: string, nodeId: string): Promise<void> {
		await this.jobProvisioner.deprovisionOwnerMember(this.owner.member(workflowId, nodeId));
	}

	/**
	 * Delete every poll job for the workflow, keyed by workflow alone so a
	 * deactivation retried after in-memory state is gone still finds the rows. No-op
	 * when none exist, so it is safe on the legacy deactivation paths too.
	 */
	async removeWorkflow(workflowId: string): Promise<void> {
		await this.jobProvisioner.deprovisionOwnerTaskType(
			this.owner.ref(workflowId),
			POLL_TRIGGER_TASK_TYPE,
		);
	}

	/**
	 * Delete the workflow's poll jobs within a caller-owned transaction, so removal
	 * commits atomically with the `active = false` write. Keyed and idempotent like {@link removeWorkflow}.
	 */
	async removeWorkflowInTransaction(manager: EntityManager, workflowId: string): Promise<void> {
		await this.jobProvisioner.deprovisionOwnerTaskTypeInTransaction(
			manager,
			this.owner.ref(workflowId),
			POLL_TRIGGER_TASK_TYPE,
		);
	}
}

/**
 * Resolve `workflow.timezone` to a concrete IANA zone. The `'DEFAULT'` sentinel
 * and empty string (no override) would fail `validateCron`, so fall back to the
 * instance default.
 */
function resolveTimezone(timezone: string, defaultTimezone: string): string {
	return !timezone || timezone === 'DEFAULT' ? defaultTimezone : timezone;
}

/**
 * Deterministic integer in `[min, max)` from `seed`+`label`, filling a generated poll
 * time's unspecified cron fields. Seeded on node identity so the cron string (and thus the
 * job's reconcile-in-place identity) stays stable across re-activation.
 */
function stableInt(seed: string, label: string, min: number, max: number): number {
	const hash = createHash('sha256').update(`${seed}:${label}`).digest();
	return min + (hash.readUInt32BE(0) % (max - min));
}

/**
 * Build a 6-field cron for a poll time. Generated cadences get a node-seeded (not random)
 * seconds field for a stable job identity; a custom cron is used as-is, widened from 5 to
 * 6 fields when it omits seconds, so every stored expression is one shape.
 */
function seededCron(item: TriggerTime, seed: string): CronExpression {
	if (item.mode === 'custom') {
		const trimmed = item.cronExpression.trim();
		return (trimmed.split(/\s+/).length === 5 ? `0 ${trimmed}` : trimmed) as CronExpression;
	}

	const second = stableInt(seed, 'second', 0, 60);

	switch (item.mode) {
		case 'everyMinute':
			return `${second} * * * * *`;
		case 'everyHour':
			return `${second} ${item.minute} * * * *`;
		case 'everyX': {
			if (item.unit === 'minutes') return `${second} */${item.value} * * * *`;
			const minute = stableInt(seed, 'minute', 0, 60);
			return `${second} ${minute} */${item.value} * * *`;
		}
		case 'everyDay':
			return `${second} ${item.minute} ${item.hour} * * *`;
		case 'everyWeek':
			return `${second} ${item.minute} ${item.hour} * * ${item.weekday}`;
		case 'everyMonth':
			return `${second} ${item.minute} ${item.hour} ${item.dayOfMonth} * *`;
	}
}
