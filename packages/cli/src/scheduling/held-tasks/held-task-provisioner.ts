import {
	DEFAULT_MISFIRE_GRACE_SECONDS,
	ScheduledJobKind,
	ScheduledJobMisfirePolicy,
} from '@n8n/constants';
import type { NewScheduledJob, ScheduledJob, ScheduledJobOwner } from '@n8n/db';
import { DataSource, ScheduledJobRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isDeepStrictEqual } from 'node:util';

/** One hold job a module wants: one task that one main keeps while the work runs. */
export interface HeldJob {
	name: string;
	owner: ScheduledJobOwner;
	taskType: string;
	payload: Record<string, unknown>;
	/** Bounds the time from the claim to `ready()`. */
	timeoutSeconds: number;
	/** Failed starts allowed before the task fails. */
	maxAttempts: number;
	/** `null` uses the scheduler's lease. */
	leaseSeconds: number | null;
}

/**
 * Creates and deletes hold jobs. A hold job has no schedule and no clock, so the
 * materializer never reads it: provisioning seeds its one task directly, and
 * deleting the job deletes the task through the foreign key cascade.
 */
@Service()
export class HeldTaskProvisioner {
	constructor(
		private readonly dataSource: DataSource,
		private readonly jobs: ScheduledJobRepository,
	) {}

	/** Insert the jobs that do not exist yet, and give each its task. Existing jobs are left as they are. */
	async provision(heldJobs: HeldJob[]): Promise<number[]> {
		if (heldJobs.length === 0) return [];
		return await this.dataSource.transaction(async (manager) => {
			const ids = await this.jobs.insertMany(manager, heldJobs.map(toJobRow));
			await this.jobs.seedHeldTasks(manager, ids);
			return ids;
		});
	}

	/**
	 * Make the hold jobs of `ownerType` match `desired`, by owner id: insert the
	 * missing ones, delete the extra ones, and redefine in place the ones whose
	 * payload or run options changed, so their holder lets go and the next holder
	 * arms with the new values. With `scope`, only jobs of those owner ids are touched.
	 */
	async sync(ownerType: string, desired: HeldJob[], scope?: readonly string[]): Promise<void> {
		await this.dataSource.transaction(async (manager) => {
			const existing = await this.jobs.findByOwnerType(manager, ownerType, scope);
			const existingById = new Map(existing.map((job) => [job.ownerId, job]));
			const desiredIds = new Set(desired.map((job) => job.owner.ownerId));

			await this.jobs.deleteManyByIds(
				manager,
				existing.filter((job) => !desiredIds.has(job.ownerId)).map((job) => job.id),
			);
			for (const job of desired) {
				const stored = existingById.get(job.owner.ownerId);
				if (stored !== undefined && !sameHeldJob(stored, job)) {
					await this.jobs.redefineHeldJob(manager, stored.id, {
						name: job.name,
						payload: job.payload,
						maxAttempts: job.maxAttempts,
						timeoutSeconds: job.timeoutSeconds,
						leaseSeconds: job.leaseSeconds,
					});
				}
			}
			const ids = await this.jobs.insertMany(
				manager,
				desired.filter((job) => !existingById.has(job.owner.ownerId)).map(toJobRow),
			);
			await this.jobs.seedHeldTasks(manager, ids);
		});
	}

	/** Delete an owner member's hold jobs. A holder sees its claim gone on its next renewal. */
	async deprovision(owner: ScheduledJobOwner): Promise<number> {
		return await this.dataSource.transaction(
			async (manager) => await this.jobs.deleteByOwnerMember(manager, owner),
		);
	}
}

function toJobRow(job: HeldJob): NewScheduledJob {
	return {
		name: job.name,
		...job.owner,
		taskType: job.taskType,
		payload: job.payload,
		kind: ScheduledJobKind.Hold,
		cronExpression: null,
		timezone: null,
		recurrenceUnit: null,
		recurrenceSize: null,
		intervalSeconds: null,
		fireAt: null,
		nextRunAt: null,
		maxAttempts: job.maxAttempts,
		timeoutSeconds: job.timeoutSeconds,
		misfirePolicy: ScheduledJobMisfirePolicy.Skip,
		misfireGraceSeconds: DEFAULT_MISFIRE_GRACE_SECONDS,
		concurrencyLimit: null,
		leaseSeconds: job.leaseSeconds,
	};
}

function sameHeldJob(stored: ScheduledJob, wanted: HeldJob): boolean {
	return (
		stored.name === wanted.name &&
		stored.taskType === wanted.taskType &&
		stored.maxAttempts === wanted.maxAttempts &&
		stored.timeoutSeconds === wanted.timeoutSeconds &&
		stored.leaseSeconds === wanted.leaseSeconds &&
		isDeepStrictEqual(stored.payload, wanted.payload)
	);
}
