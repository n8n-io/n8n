import type { NewScheduledJob, ScheduledJob } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { createJobProvisioner } from '@n8n/scheduler';
import type {
	DesiredJob,
	ExistingJob,
	JobProvisioner,
	ProvisionSummary,
	RunInDeprovisionTransaction,
	RunInProvisionTransaction,
	ScheduleDefinition,
} from '@n8n/scheduler';
import { Tracing } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { createSchedulerTracer } from './scheduler-tracer';

/** Identifies one workflow node's jobs, and stamps the rows provisioning inserts. */
interface ProvisionScope {
	workflowId: string;
	nodeId: string;
	taskType: string;
	payload: Record<string, unknown>;
}

/** Identifies one workflow node's jobs for deletion. */
type DeprovisionScope = Pick<ProvisionScope, 'workflowId' | 'nodeId'>;

/** A job row's schedule columns: one `ScheduleDefinition` flattened for storage. */
type ScheduleColumns = Pick<
	ScheduledJob,
	| 'kind'
	| 'cronExpression'
	| 'timezone'
	| 'recurrenceUnit'
	| 'recurrenceSize'
	| 'intervalSeconds'
	| 'fireAt'
>;

/**
 * The write side of the durable scheduler: persists a workflow node's scheduled
 * jobs. The provisioning logic itself lives in the scheduler package (see
 * {@link createJobProvisioner}); this service only binds that package's
 * transaction ports to the `@n8n/db` repositories and maps between the domain
 * `ScheduleDefinition` and the flat `scheduled_job` columns.
 *
 * The counterpart to `DurableScheduler`'s run side, deliberately a separate
 * service: authoring a node's jobs must not depend on this instance running the
 * scheduler loops, and the two only meet at the `scheduled_job` table.
 *
 * A `ScheduleDefinition` is a discriminated union (one variant per kind); the
 * flat columns are a persistence detail, so the mapping between the two
 * ({@link scheduleColumns} / {@link rowSchedule}) lives here at the DB boundary.
 */
@Service()
export class DurableJobProvisioner {
	private readonly provisioner: JobProvisioner<ProvisionScope, DeprovisionScope>;

	constructor(
		private readonly dataSource: DataSource,
		private readonly jobs: ScheduledJobRepository,
		private readonly tasks: ScheduledTaskRepository,
		tracing: Tracing,
	) {
		this.provisioner = createJobProvisioner<ProvisionScope, DeprovisionScope>({
			provisionTransaction: (scope) => this.provisionTransaction(scope),
			deprovisionTransaction: (scope) => this.deprovisionTransaction(scope),
			tracer: createSchedulerTracer(tracing),
		});
	}

	/**
	 * Provision a node's jobs so the stored set matches `desired`, matched by name;
	 * see the package's `provision`. `taskType`/`payload` stamp the rows it inserts.
	 */
	async provision(
		workflowId: string,
		nodeId: string,
		taskType: string,
		payload: Record<string, unknown>,
		desired: DesiredJob[],
	): Promise<ProvisionSummary> {
		return await this.provisioner.provision({ workflowId, nodeId, taskType, payload }, desired);
	}

	/** Delete all of a node's jobs; their queued tasks cascade away. */
	async deprovision(workflowId: string, nodeId: string): Promise<{ removed: number }> {
		return await this.provisioner.deprovision({ workflowId, nodeId });
	}

	private provisionTransaction({
		workflowId,
		nodeId,
		taskType,
		payload,
	}: ProvisionScope): RunInProvisionTransaction {
		return async (work) =>
			await this.dataSource.transaction(
				async (manager) =>
					await work({
						findExisting: async () => {
							const rows = await this.jobs.findManyByWorkflowNode(manager, workflowId, nodeId);
							return rows.map(
								(row): ExistingJob => ({
									id: row.id,
									name: row.name,
									schedule: rowSchedule(row),
									hasClock: row.nextRunAt !== null,
								}),
							);
						},
						insert: async (desired) => {
							const rows = desired.map(
								(job): NewScheduledJob => ({
									name: job.name,
									workflowId,
									nodeId,
									taskType,
									payload,
									...scheduleColumns(job.schedule),
									nextRunAt: job.firstRunAt,
								}),
							);
							return await this.jobs.insertMany(manager, rows);
						},
						redefine: async (jobId, schedule, nextRunAt) =>
							await this.jobs.updateDefinition(manager, jobId, {
								...scheduleColumns(schedule),
								nextRunAt,
							}),
						withdrawPendingTasks: async (jobIds) =>
							await this.tasks.deletePendingByJobIds(manager, jobIds),
						deleteJobs: async (jobIds) => await this.jobs.deleteManyByIds(manager, jobIds),
					}),
			);
	}

	private deprovisionTransaction({
		workflowId,
		nodeId,
	}: DeprovisionScope): RunInDeprovisionTransaction {
		return async (work) =>
			await this.dataSource.transaction(
				async (manager) =>
					await work({
						deleteAll: async () =>
							await this.jobs.deleteByWorkflowNode(manager, workflowId, nodeId),
					}),
			);
	}
}

/** Flatten a {@link ScheduleDefinition} into the row columns it stores; absent fields are null. */
function scheduleColumns(schedule: ScheduleDefinition): ScheduleColumns {
	const empty = {
		cronExpression: null,
		timezone: null,
		recurrenceUnit: null,
		recurrenceSize: null,
		intervalSeconds: null,
		fireAt: null,
	};
	switch (schedule.kind) {
		case 'cron':
			return {
				...empty,
				kind: schedule.kind,
				cronExpression: schedule.cronExpression,
				timezone: schedule.timezone,
			};
		case 'recurring_cron':
			return {
				...empty,
				kind: schedule.kind,
				cronExpression: schedule.cronExpression,
				timezone: schedule.timezone,
				recurrenceUnit: schedule.recurrenceUnit,
				recurrenceSize: schedule.recurrenceSize,
			};
		case 'interval':
			return { ...empty, kind: schedule.kind, intervalSeconds: schedule.intervalSeconds };
		case 'one_off':
			return { ...empty, kind: schedule.kind, fireAt: schedule.fireAt };
	}
}

/**
 * Rebuild a {@link ScheduleDefinition} from a stored row, so provisioning can
 * diff it against the desired schedule. Rows are written by {@link scheduleColumns},
 * so a row of a given kind always carries that kind's columns; the coalescing only
 * guards a hand-corrupted row, which then reads as changed and is rewritten.
 *
 * A `kind` outside the known set (a row from a newer main during a mixed-version
 * deploy, a rollback, or a hand-edit) can't be diffed, so it throws rather than
 * returning `undefined` and tripping a downstream `sameSchedule` on a bad value.
 */
function rowSchedule(row: ScheduledJob): ScheduleDefinition {
	switch (row.kind) {
		case 'cron':
			return { kind: 'cron', cronExpression: row.cronExpression ?? '', timezone: row.timezone };
		case 'recurring_cron':
			return {
				kind: 'recurring_cron',
				cronExpression: row.cronExpression ?? '',
				timezone: row.timezone,
				recurrenceUnit: row.recurrenceUnit ?? 'hours',
				recurrenceSize: row.recurrenceSize ?? 0,
			};
		case 'interval':
			return { kind: 'interval', intervalSeconds: row.intervalSeconds ?? 0 };
		case 'one_off':
			return { kind: 'one_off', fireAt: row.fireAt ?? new Date(0) };
		default: {
			const exhaustive: never = row.kind;
			throw new UnexpectedError(`Unexpected scheduled job kind: ${JSON.stringify(exhaustive)}`);
		}
	}
}
