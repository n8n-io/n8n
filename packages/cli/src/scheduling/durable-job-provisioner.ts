import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { MAX_INTEGER_32BITS_SIGNED, type ScheduledJobMisfirePolicy, Time } from '@n8n/constants';
import type {
	EntityManager,
	NewScheduledJob,
	ScheduledJobOwner,
	ScheduledJobOwnerRef,
} from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { createJobProvisioner, withOwnerKeys } from '@n8n/scheduler';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type {
	DesiredJob,
	ExistingJob,
	JobProvisioner,
	ProvisionSummary,
	RunInDeprovisionTransaction,
	RunInProvisionTransaction,
} from '@n8n/scheduler';
import { Tracing } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import { isDeepStrictEqual } from 'node:util';

import { AgentScheduledJobOwner } from './agent-scheduled-job-owner';
import { rowSchedule, scheduleColumns } from './schedule-columns';
import { createScheduledJobOwnerRegistry } from './scheduled-job-owner-registry';
import { createSchedulerTracer } from './scheduler-tracer';
import { SystemTaskScheduledJobOwner } from './system-tasks/system-task-scheduled-job-owner';
import { WorkflowScheduledJobOwner } from './workflow-scheduled-job-owner';

/**
 * Ceiling for a resolved misfire grace: the cap the config value carries, and well
 * inside the column's `int` range.
 */
const MAX_MISFIRE_GRACE_SECONDS = 30 * Time.days.toSeconds;

/**
 * Ceiling for a concurrency limit: what the column's `int` holds. Postgres rejects
 * anything above it outright, so it is checked here for both dialects to behave the
 * same.
 */
const MAX_CONCURRENCY_LIMIT = MAX_INTEGER_32BITS_SIGNED;

/** One provisioning call: whose jobs to reconcile, and what to stamp on new rows. */
export interface ProvisionRequest {
	/** Who these jobs belong to. */
	owner: ScheduledJobOwner;
	/** Selects the registered handler that runs each occurrence. */
	taskType: string;
	/** Input handed to that handler. */
	payload: Record<string, unknown>;
	/** The jobs the owner wants stored, matched to existing rows by name. */
	desired: DesiredJob[];
	misfirePolicy: ScheduledJobMisfirePolicy;
	/**
	 * How late an occurrence may still be and count as on time. Clamped to the
	 * scheduler's own floor and ceiling; omit to inherit the instance default.
	 */
	misfireGraceSeconds?: number;
	/** Retry ceiling stamped on each occurrence; omit to inherit the instance setting. */
	maxAttempts?: number;
	/**
	 * How many of the job's occurrences may run at the same time. Omit or pass
	 * `null` for no limit.
	 */
	concurrencyLimit?: number | null;
}

/** What provisioning stamps on the rows it writes, plus the owner it diffs against. */
type ProvisionScope = Omit<ProvisionRequest, 'desired'>;

/** One job as a caller read it, identified by id and pinned to the payload it saw. */
export interface ObservedJob {
	id: number;
	payload: Record<string, unknown>;
}

/**
 * Which jobs to delete: one member's, all of an owner's, an owner's of one task
 * type, or one job as it was read. Tagged rather than told apart by the shape of
 * `owner`, since a full {@link ScheduledJobOwner} is assignable to a
 * {@link ScheduledJobOwnerRef}.
 */
type DeprovisionScope =
	| { scope: 'member'; owner: ScheduledJobOwner }
	| { scope: 'owner'; owner: ScheduledJobOwnerRef }
	| { scope: 'task-type'; owner: ScheduledJobOwnerRef; taskType: string }
	| { scope: 'job'; job: ObservedJob };

/**
 * The write side of the durable scheduler: persists an owner's scheduled jobs.
 * The provisioning logic itself lives in the scheduler package (see
 * {@link createJobProvisioner}); this service only binds that package's
 * transaction ports to the `@n8n/db` repositories and maps between the domain
 * `ScheduleDefinition` and the flat `scheduled_job` columns.
 *
 * ## Owning scheduled jobs
 *
 * An owner is plain data on the row: `ownerType`, `ownerId` and an optional
 * `ownerMemberId`. Nothing here interprets them, so any module can own jobs. In
 * exchange it owes two things, and neither replaces the other:
 *
 * 1. **Deprovision synchronously.** Call {@link deprovisionOwnerInTransaction}
 *    (or a sibling) in the same transaction that deletes the owner. No database
 *    cascade backs these rows, so a job outlives its owner until something
 *    deletes it.
 * 2. **Register a liveness resolver.** Declare the module in
 *    `createScheduledJobOwnerRegistry`, answering "which of these owner ids
 *    still exist?". The reconciliation sweep retires what a failed deprovision
 *    left behind, and provisioning refuses an owner type without one.
 *
 * The scheduler README's "Owning scheduled jobs" section is the long form.
 *
 * ## Relationship to the run side
 *
 * A separate service from `DurableScheduler`'s run side on purpose: authoring an
 * owner's jobs must not depend on this instance running the scheduler loops. It
 * seeds a new job's first occurrences itself (see {@link seedInitialOccurrences}),
 * so the two also meet at `scheduled_task`.
 *
 * A `ScheduleDefinition` is a discriminated union (one variant per kind); the
 * flat columns are a persistence detail, so the mapping between the two
 * ({@link scheduleColumns} / {@link rowSchedule}) lives here at the DB boundary.
 */
@Service()
export class DurableJobProvisioner {
	private readonly provisioner: JobProvisioner<ProvisionScope, DeprovisionScope>;

	constructor(
		private readonly logger: Logger,
		private readonly dataSource: DataSource,
		private readonly jobs: ScheduledJobRepository,
		private readonly tasks: ScheduledTaskRepository,
		private readonly globalConfig: GlobalConfig,
		workflowOwner: WorkflowScheduledJobOwner,
		agentOwner: AgentScheduledJobOwner,
		systemTaskOwner: SystemTaskScheduledJobOwner,
		tracing: Tracing,
	) {
		this.logger = this.logger.scoped('scheduler');
		this.provisioner = createJobProvisioner<ProvisionScope, DeprovisionScope>({
			provisionTransaction: (scope) => this.provisionTransaction(scope),
			deprovisionTransaction: (scope) => this.deprovisionTransaction(scope),
			owners: createScheduledJobOwnerRegistry(workflowOwner, agentOwner, systemTaskOwner),
			tracer: createSchedulerTracer(tracing),
			materializer: {
				windowSeconds: globalConfig.scheduler.materializationWindowSeconds,
				defaultTimezone: globalConfig.generic.timezone,
			},
			seedHooks: {
				// A just-registered job was already validated, so a seed-time plan failure is
				// unexpected; log it (the pass defers the job, as a poll would) instead of
				// letting it pass silently, matching the run side's reporting.
				onPlanError: (job, error) =>
					this.logger.error('Failed to plan a scheduled job while seeding its first run', {
						jobId: job.id,
						error: ensureError(error).message,
					}),
				onSkippedDuplicates: (context) =>
					this.logger.debug('Seeding skipped occurrences already recorded for a scheduled job', {
						...context,
					}),
			},
		});
	}

	/**
	 * Reconcile one owner member's stored jobs to `request.desired`, matched by
	 * name. An unchanged job keeps its row, its id and its queued occurrences.
	 *
	 * @throws {UnregisteredOwnerTypeError} when the owner type has no registered
	 * liveness resolver (see {@link createJobProvisioner}).
	 * @throws {InvalidOwnerIdError} when the owner id is empty or too long to store.
	 * @throws {InvalidOwnerMemberIdError} when the owner member id is empty or too long to store.
	 * @throws {UserError} when the concurrency limit is not a whole number of at least 1.
	 * @returns what the call inserted, redefined, left unchanged and removed.
	 */
	async provision({ desired, ...scope }: ProvisionRequest): Promise<ProvisionSummary> {
		return await this.provisioner.provision(scope, desired);
	}

	/**
	 * Delete the jobs of one owner member; their queued tasks cascade away.
	 * Idempotent.
	 *
	 * Owner modules must call this or a sibling from their own delete path:
	 * nothing in the database removes a job when its owner goes away.
	 */
	async deprovisionOwnerMember(owner: ScheduledJobOwner): Promise<{ removed: number }> {
		return await this.provisioner.deprovision({ scope: 'member', owner });
	}

	/**
	 * Delete every job an owner holds, whichever member provisioned it; their
	 * queued tasks cascade away. Idempotent.
	 */
	async deprovisionOwner(owner: ScheduledJobOwnerRef): Promise<{ removed: number }> {
		return await this.provisioner.deprovision({ scope: 'owner', owner });
	}

	/**
	 * Delete an owner's jobs of one task type, whichever member owns them; their
	 * queued tasks cascade away. Idempotent.
	 */
	async deprovisionOwnerTaskType(
		owner: ScheduledJobOwnerRef,
		taskType: string,
	): Promise<{ removed: number }> {
		return await this.provisioner.deprovision({ scope: 'task-type', owner, taskType });
	}

	/**
	 * Delete one job while its payload is still what the caller read, so a delete
	 * decided on a listing cannot remove a row another instance rewrote in between.
	 * Its queued tasks cascade away.
	 */
	async deprovisionUnchangedJob(job: ObservedJob): Promise<{ removed: number }> {
		return await this.provisioner.deprovision({ scope: 'job', job });
	}

	/**
	 * Delete every job an owner holds within a caller-owned transaction; their
	 * queued tasks cascade away. The main teardown path: it commits with the
	 * caller's own delete, so a crash cannot leave jobs behind.
	 */
	async deprovisionOwnerInTransaction(
		manager: EntityManager,
		owner: ScheduledJobOwnerRef,
	): Promise<void> {
		await this.jobs.deleteByOwnerRef(manager, owner);
	}

	/**
	 * {@link deprovisionOwnerInTransaction} narrowed to one task type, for a
	 * caller that owns only part of an owner's jobs.
	 */
	async deprovisionOwnerTaskTypeInTransaction(
		manager: EntityManager,
		owner: ScheduledJobOwnerRef,
		taskType: string,
	): Promise<void> {
		await this.jobs.deleteByOwnerTaskType(manager, owner, taskType);
	}

	private provisionTransaction({
		owner,
		taskType,
		payload,
		misfirePolicy,
		misfireGraceSeconds: requestedMisfireGraceSeconds,
		maxAttempts: requestedMaxAttempts,
		concurrencyLimit: requestedConcurrencyLimit,
	}: ProvisionScope): RunInProvisionTransaction {
		const misfireGraceSeconds = this.resolveMisfireGraceSeconds(
			requestedMisfireGraceSeconds,
			owner,
		);
		const maxAttempts = requestedMaxAttempts ?? this.globalConfig.scheduler.maxAttempts;
		const concurrencyLimit = resolveConcurrencyLimit(requestedConcurrencyLimit);
		return async (work) =>
			await this.dataSource.transaction(async (manager) => {
				// Provisioning is evidence the owner is back, so lift any quarantine now
				// rather than wait for the sweep. A quarantined row has no clock, so the
				// diff below always redefines or removes it anyway.
				const revived = await this.jobs.liftQuarantineByOwner(manager, owner);
				if (revived > 0) {
					this.logger.info('Lifted the quarantine on scheduled jobs while provisioning them', {
						...owner,
						jobs: revived,
					});
				}
				const existingRows = await this.jobs.findManyByOwner(manager, owner);
				const outdatedRunOptionJobIds: number[] = [];
				const outdatedGraceJobIds: number[] = [];
				const outdatedPayloadJobIds: number[] = [];
				for (const row of existingRows) {
					const graceChanged = row.misfireGraceSeconds !== misfireGraceSeconds;
					if (graceChanged) {
						outdatedGraceJobIds.push(row.id);
					}
					if (
						graceChanged ||
						row.misfirePolicy !== misfirePolicy ||
						row.maxAttempts !== maxAttempts ||
						row.concurrencyLimit !== concurrencyLimit
					) {
						outdatedRunOptionJobIds.push(row.id);
					}
					if (!isDeepStrictEqual(row.payload, payload)) {
						outdatedPayloadJobIds.push(row.id);
					}
				}
				// Before the provision, whose seed reads these rows back and must see the
				// current run options and payload.
				// Only `redefine` touches a job's run options, so an unchanged schedule
				// needs this to pick up a change to them on its own.
				await this.jobs.updateRunOptions(manager, outdatedRunOptionJobIds, {
					maxAttempts,
					misfirePolicy,
					misfireGraceSeconds,
					concurrencyLimit,
				});
				// Only `insert` writes the payload, so an existing row picks up a change to it here.
				await this.jobs.updatePayload(manager, outdatedPayloadJobIds, payload);
				// Queued tasks were stamped with the previous grace; recompute their deadline.
				await this.tasks.updateMissedAfterForJobs(
					manager,
					outdatedGraceJobIds,
					misfireGraceSeconds,
				);
				return await work({
					findExisting: async () =>
						existingRows.map(
							(row): ExistingJob => ({
								id: row.id,
								name: row.name,
								schedule: rowSchedule(row),
								hasClock: row.nextRunAt !== null,
							}),
						),
					insert: async (desired) => {
						const rows = desired.map(
							(job): NewScheduledJob => ({
								name: job.name,
								...owner,
								taskType,
								payload,
								...scheduleColumns(job.schedule),
								nextRunAt: job.firstRunAt,
								maxAttempts,
								misfirePolicy,
								misfireGraceSeconds,
								concurrencyLimit,
							}),
						);
						return await this.jobs.insertMany(manager, rows);
					},
					redefine: async (jobId, schedule, nextRunAt) => {
						await this.jobs.updateDefinition(manager, jobId, {
							...scheduleColumns(schedule),
							nextRunAt,
							maxAttempts,
							misfirePolicy,
							misfireGraceSeconds,
							concurrencyLimit,
						});
					},
					withdrawPendingTasks: async (jobIds) =>
						await this.tasks.deletePendingByJobIds(manager, jobIds),
					deleteJobs: async (jobIds) => await this.jobs.deleteManyByIds(manager, jobIds),
					// DB time, not this instance's clock, so the seed sizes its window the way a
					// poll would and every instance agrees on it (see `DueJobs.now`).
					readJobs: async (jobIds) => {
						const now = await this.tasks.readDbTime(manager);
						const jobs = await this.jobs.findManyByIds(manager, jobIds);
						return withOwnerKeys({ now, jobs });
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
			});
	}

	private resolveMisfireGraceSeconds(requested: unknown, owner: ScheduledJobOwner): number {
		const { misfireGraceSeconds, executorIntervalSeconds, materializationWindowSeconds } =
			this.globalConfig.scheduler;

		const numeric = Number(requested);
		if (!Number.isFinite(numeric)) {
			return misfireGraceSeconds;
		}

		const truncated = Math.trunc(numeric);
		if (truncated < 1) {
			return misfireGraceSeconds;
		}

		const floor = Math.min(
			Math.max(executorIntervalSeconds + 1, materializationWindowSeconds),
			MAX_MISFIRE_GRACE_SECONDS,
		);

		if (!Number.isFinite(floor)) {
			return misfireGraceSeconds;
		}

		const effective = Math.min(Math.max(truncated, floor), MAX_MISFIRE_GRACE_SECONDS);

		if (effective !== truncated || numeric > MAX_MISFIRE_GRACE_SECONDS) {
			this.logger.warn(
				effective > truncated
					? "Raised a node's misfire grace to the scheduler's minimum"
					: "Lowered a node's misfire grace to the scheduler's maximum",
				{
					...owner,
					requestedMisfireGraceSeconds: numeric,
					misfireGraceSeconds: effective,
				},
			);
		}

		return effective;
	}

	private deprovisionTransaction(scope: DeprovisionScope): RunInDeprovisionTransaction {
		return async (work) =>
			await this.dataSource.transaction(
				async (manager) =>
					await work({
						deleteAll: async () => await this.deleteScope(manager, scope),
					}),
			);
	}

	private async deleteScope(manager: EntityManager, target: DeprovisionScope): Promise<number> {
		switch (target.scope) {
			case 'member':
				return await this.jobs.deleteByOwnerMember(manager, target.owner);
			case 'owner':
				return await this.jobs.deleteByOwnerRef(manager, target.owner);
			case 'task-type':
				return await this.jobs.deleteByOwnerTaskType(manager, target.owner, target.taskType);
			case 'job':
				return await this.jobs.deleteIfPayloadUnchanged(manager, target.job.id, target.job.payload);
		}
	}
}

/**
 * Normalize a requested concurrency ceiling to what the column stores: a whole
 * number from 1 to {@link MAX_CONCURRENCY_LIMIT}, or `null` for no limit.
 *
 * @throws {UserError} when the limit is set but falls outside that range. A ceiling
 * below one would hold every occurrence back until its misfire deadline passed, so
 * the job would never run.
 */
function resolveConcurrencyLimit(requested: number | null | undefined): number | null {
	if (requested === undefined || requested === null) {
		return null;
	}
	if (!Number.isInteger(requested) || requested < 1 || requested > MAX_CONCURRENCY_LIMIT) {
		throw new UserError('Scheduled job concurrency limit is outside the range the column holds', {
			extra: { concurrencyLimit: requested, maxConcurrencyLimit: MAX_CONCURRENCY_LIMIT },
		});
	}
	return requested;
}
