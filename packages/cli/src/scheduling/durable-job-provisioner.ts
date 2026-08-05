import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { EntityManager, NewScheduledJob, ScheduledJob } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { createJobProvisioner, DEFAULT_MATERIALIZER_OPTIONS, materialize } from '@n8n/scheduler';
import type {
	DesiredJob,
	ExistingJob,
	JobProvisioner,
	MaterializerOptions,
	ProvisionSummary,
	RunInDeprovisionTransaction,
	RunInProvisionTransaction,
	RunInTransaction,
	ScheduleDefinition,
} from '@n8n/scheduler';
import { Tracing } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { createSchedulerTracer } from './scheduler-tracer';

/**
 * What a set of jobs belongs to.
 *
 * Most jobs are a workflow trigger node's, and `(workflowId, nodeId)` names them.
 * Some belong to nothing on the canvas — one person's own schedule for a
 * workflow, where several people hold their own schedules for the same workflow
 * and no node distinguishes them. Those carry an `ownerId` the scheduler treats
 * as opaque and only ever pairs with `taskType`, so a feature can own jobs
 * without this service learning about the feature.
 *
 * An owner-scoped job records no `workflowId`, and cannot: the column is a
 * foreign key onto `workflow_published_version`, so it means "this job belongs
 * to a published trigger" — which an owner-scoped job by definition does not.
 * The owner is responsible for knowing what its jobs run.
 */
type JobOwner =
	| { ownerId?: undefined; workflowId: string; nodeId: string }
	| { ownerId: string; workflowId?: undefined; nodeId?: undefined };

/** Identifies one job set, and stamps the rows provisioning inserts. */
type ProvisionScope = JobOwner & {
	taskType: string;
	payload: Record<string, unknown>;
	misfirePolicy: ScheduledJobMisfirePolicy;
};

/**
 * Identifies jobs for deletion: one node's jobs, one owner's jobs of a task
 * type, or one workflow's jobs of a task type.
 */
type DeprovisionScope =
	| { workflowId: string; nodeId: string }
	| { ownerId: string; taskType: string }
	| { workflowId: string; taskType: string };

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
 * scheduler loops. It also seeds a new job's first window of tasks itself (see
 * {@link seedInitialOccurrences}), so the two meet at the `scheduled_task` table
 * too, not only `scheduled_job`.
 *
 * A `ScheduleDefinition` is a discriminated union (one variant per kind); the
 * flat columns are a persistence detail, so the mapping between the two
 * ({@link scheduleColumns} / {@link rowSchedule}) lives here at the DB boundary.
 */
@Service()
export class DurableJobProvisioner {
	private readonly provisioner: JobProvisioner<ProvisionScope, DeprovisionScope>;

	/**
	 * Options for the provision-time seed materialization. Mirrors what the running
	 * materializer uses, so an eagerly-seeded job records the same occurrences it
	 * would on its first poll (see {@link seedInitialOccurrences}).
	 */
	private readonly materializerOptions: MaterializerOptions;

	constructor(
		private readonly logger: Logger,
		private readonly dataSource: DataSource,
		private readonly jobs: ScheduledJobRepository,
		private readonly tasks: ScheduledTaskRepository,
		private readonly globalConfig: GlobalConfig,
		tracing: Tracing,
	) {
		this.logger = this.logger.scoped('scheduler');
		this.provisioner = createJobProvisioner<ProvisionScope, DeprovisionScope>({
			provisionTransaction: (scope) => this.provisionTransaction(scope),
			deprovisionTransaction: (scope) => this.deprovisionTransaction(scope),
			tracer: createSchedulerTracer(tracing),
		});
		this.materializerOptions = {
			...DEFAULT_MATERIALIZER_OPTIONS,
			windowSeconds: globalConfig.scheduler.materializationWindowSeconds,
			defaultTimezone: globalConfig.generic.timezone,
		};
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
		misfirePolicy: ScheduledJobMisfirePolicy,
	): Promise<ProvisionSummary> {
		return await this.provisioner.provision(
			{ workflowId, nodeId, taskType, payload, misfirePolicy },
			desired,
		);
	}

	/**
	 * Provision the jobs of an owner that is not a trigger node, matched by name
	 * within `(ownerId, taskType)`.
	 *
	 * Nothing in the database removes these when the thing that owns them goes:
	 * `ownerId` carries no foreign key, and the rows record no `workflowId` to
	 * cascade from either, so the caller must {@link deprovisionOwner} before
	 * deleting its own row.
	 */
	async provisionForOwner(
		ownerId: string,
		taskType: string,
		payload: Record<string, unknown>,
		desired: DesiredJob[],
		misfirePolicy: ScheduledJobMisfirePolicy,
	): Promise<ProvisionSummary> {
		return await this.provisioner.provision({ ownerId, taskType, payload, misfirePolicy }, desired);
	}

	/** Delete all of a node's jobs; their queued tasks cascade away. */
	async deprovision(workflowId: string, nodeId: string): Promise<{ removed: number }> {
		return await this.provisioner.deprovision({ workflowId, nodeId });
	}

	/** Delete all of one owner's jobs of a task type; their queued tasks cascade away. */
	async deprovisionOwner(ownerId: string, taskType: string): Promise<{ removed: number }> {
		return await this.provisioner.deprovision({ ownerId, taskType });
	}

	/**
	 * Delete all of a workflow's jobs of one task type, whichever nodes own them;
	 * their queued tasks cascade away. For teardown paths that no longer know the
	 * owning node ids.
	 */
	async deprovisionWorkflow(workflowId: string, taskType: string): Promise<{ removed: number }> {
		return await this.provisioner.deprovision({ workflowId, taskType });
	}

	/**
	 * Delete all of a workflow's jobs of one task type within a caller-owned
	 * transaction; their queued tasks cascade away. Lets a deactivation commit the
	 * durable-job removal atomically with its own `active = false` write, on the
	 * main handling the request, instead of routing through the leader. A single
	 * DELETE, so it skips the provisioner's transaction port.
	 */
	async deprovisionWorkflowInTransaction(
		manager: EntityManager,
		workflowId: string,
		taskType: string,
	): Promise<void> {
		await this.jobs.deleteByWorkflowTaskType(manager, workflowId, taskType);
	}

	private provisionTransaction(scope: ProvisionScope): RunInProvisionTransaction {
		const { ownerId, workflowId, nodeId, taskType, payload, misfirePolicy } = scope;
		const misfireGraceSeconds = this.globalConfig.scheduler.misfireGraceSeconds;
		return async (work) =>
			await this.dataSource.transaction(async (manager) => {
				// Jobs freshly inserted or redefined this pass; their first window is
				// seeded before the transaction commits (see `seedInitialOccurrences`).
				const seededJobIds = new Set<number>();
				const outdatedPolicyJobIds: number[] = [];
				const result = await work({
					findExisting: async () => {
						const rows =
							ownerId === undefined
								? await this.jobs.findManyByWorkflowNode(manager, workflowId, nodeId)
								: await this.jobs.findManyByOwner(manager, ownerId, taskType);
						for (const row of rows) {
							if (
								row.misfirePolicy !== misfirePolicy ||
								row.misfireGraceSeconds !== misfireGraceSeconds
							) {
								outdatedPolicyJobIds.push(row.id);
							}
						}
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
								workflowId: workflowId ?? null,
								nodeId: nodeId ?? null,
								ownerId: ownerId ?? null,
								taskType,
								payload,
								...scheduleColumns(job.schedule),
								nextRunAt: job.firstRunAt,
								maxAttempts: this.globalConfig.scheduler.maxAttempts,
								misfirePolicy,
								misfireGraceSeconds,
							}),
						);
						const ids = await this.jobs.insertMany(manager, rows);
						for (const id of ids) seededJobIds.add(id);
						return ids;
					},
					redefine: async (jobId, schedule, nextRunAt) => {
						await this.jobs.updateDefinition(manager, jobId, {
							...scheduleColumns(schedule),
							nextRunAt,
							misfirePolicy,
							misfireGraceSeconds,
						});
						seededJobIds.add(jobId);
					},
					withdrawPendingTasks: async (jobIds) =>
						await this.tasks.deletePendingByJobIds(manager, jobIds),
					deleteJobs: async (jobIds) => await this.jobs.deleteManyByIds(manager, jobIds),
				});
				// Only `redefine` touches a job's misfire policy and grace, so an unchanged
				// schedule needs this to pick up a policy/grace change on its own.
				await this.jobs.updateMisfirePolicy(manager, outdatedPolicyJobIds, {
					misfirePolicy,
					misfireGraceSeconds,
				});
				// Queued tasks were stamped with the previous grace; recompute their deadline.
				await this.tasks.updateMissedAfterForJobs(
					manager,
					outdatedPolicyJobIds,
					misfireGraceSeconds,
				);
				// After all of provisioning's own writes (including withdrawing a
				// redefined job's stale tasks) so the seeded occurrences are the last word.
				await this.seedInitialOccurrences(manager, seededJobIds);
				return result;
			});
	}

	/**
	 * Record the first window of occurrences for jobs whose clock was just seeded,
	 * and advance their `nextRunAt`. Without this, a fresh job's first fire is only
	 * recorded once a materializer poll tick runs; when the first interval is
	 * shorter than the gap to that tick, the fire is recorded after it is already
	 * due and dispatched late. Seeding here queues it ahead of time, leaving the
	 * executor its usual slack to fire on schedule.
	 *
	 * Reuses the run-side {@link materialize} pass so activation and every later
	 * poll share one code path: only the claim differs, returning these specific
	 * jobs (regardless of due-ness) instead of the poll's due-jobs query. Runs on
	 * the provision transaction's manager, so the seed commits atomically with the
	 * job rows; a job with no live clock plans nothing.
	 */
	private async seedInitialOccurrences(manager: EntityManager, jobIds: Set<number>): Promise<void> {
		if (jobIds.size === 0) return;

		// DB time, not this instance's clock, so the seed sizes its window the way a
		// poll would and every instance agrees on it (see `DueJobs.now`).
		const now = await this.tasks.readDbTime();

		const seedTransaction: RunInTransaction = async (work) =>
			await work({
				// The just-written rows, read back so planning uses the persisted clock
				// and (for a redefined job) its new definition. Enabled with a live clock
				// only, mirroring the poll's claim predicate.
				claimDueJobs: async () => {
					const claimed = (await this.jobs.findManyByIds(manager, [...jobIds])).filter(
						(job) => job.enabled && job.nextRunAt !== null,
					);
					return claimed.length > 0 ? { now, jobs: claimed } : undefined;
				},
				recordOccurrences: async (occurrences) =>
					await this.tasks.insertIgnoringDuplicates(manager, occurrences),
				retireSuperseded: async (superseded) =>
					await this.tasks.updateToMissed(manager, superseded),
				advanceJobs: async (planned) =>
					await this.jobs.advanceMany(
						manager,
						planned.map(({ job, plan }) => ({
							id: job.id,
							nextRunAt: plan.nextRunAt,
							lastFiredAt: plan.lastFiredAt,
						})),
					),
			});

		await materialize(seedTransaction, this.materializerOptions, {
			// A just-registered job was already validated, so a seed-time plan failure is
			// unexpected; log it (the pass defers the job, as a poll would) instead of
			// letting it pass silently, matching the run side's reporting.
			onPlanError: (job, error) =>
				this.logger.error('Failed to plan a scheduled job while seeding its first run', {
					jobId: job.id,
					error: error instanceof Error ? error.message : String(error),
				}),
			onSkippedDuplicates: (context) =>
				this.logger.debug('Seeding skipped occurrences already recorded for a scheduled job', {
					...context,
				}),
		});
	}

	private deprovisionTransaction(scope: DeprovisionScope): RunInDeprovisionTransaction {
		return async (work) =>
			await this.dataSource.transaction(
				async (manager) =>
					await work({
						deleteAll: async () => {
							if ('nodeId' in scope) {
								return await this.jobs.deleteByWorkflowNode(
									manager,
									scope.workflowId,
									scope.nodeId,
								);
							}
							if ('ownerId' in scope) {
								return await this.jobs.deleteByOwner(manager, scope.ownerId, scope.taskType);
							}
							return await this.jobs.deleteByWorkflowTaskType(
								manager,
								scope.workflowId,
								scope.taskType,
							);
						},
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
