import { sameSchedule } from './schedule-identity';
import type {
	ProvisionTransaction,
	RunInProvisionTransaction,
	RunInDeprovisionTransaction,
} from './transaction';
import type { DesiredJob, ExistingJob, ProvisionedJob, ProvisionSummary } from './types';
import {
	DEFAULT_MATERIALIZER_OPTIONS,
	materialize,
	type MaterializerHooks,
	type MaterializerOptions,
} from '../materializer';

/**
 * Provision a scope's jobs so the stored set matches `desired`, matched by name,
 * in one transaction.
 *
 * - A desired job with no existing match is inserted.
 * - A desired job whose match already holds the same definition (and an equally
 *   live clock) is left untouched, so it keeps its id. That id anchors its queued
 *   tasks' identity and the execution dedup key, so re-registration (a
 *   re-published version, a leader takeover replaying active workflows) never
 *   double-fires instants already queued or run.
 * - A desired job whose match differs is rewritten in place and its still-pending
 *   tasks withdrawn (they belonged to the old definition).
 * - An existing job no longer desired is deleted (its tasks cascade).
 *
 * Inserted and redefined jobs then get their first window of occurrences in the
 * same transaction, planned with `options` as a materializer pass would. A first
 * fire shorter than the gap to the next pass is then queued before it is due.
 *
 * Passing an empty `desired` therefore clears the whole scope; {@link deprovision}
 * is the direct path for that.
 */
export async function provision(
	runInTransaction: RunInProvisionTransaction,
	desired: DesiredJob[],
	options: MaterializerOptions = DEFAULT_MATERIALIZER_OPTIONS,
	hooks: MaterializerHooks = {},
): Promise<ProvisionSummary> {
	return await runInTransaction(async (tx) => {
		const existing = await tx.findExisting();
		const existingByName = new Map(existing.map((job) => [job.name, job]));
		const desiredNames = new Set(desired.map((job) => job.name));

		const inserts: DesiredJob[] = [];
		const redefined: ProvisionedJob[] = [];
		const unchanged: ProvisionedJob[] = [];

		for (const job of desired) {
			const current = existingByName.get(job.name);
			if (current === undefined) {
				inserts.push(job);
			} else if (holdsDefinition(current, job)) {
				unchanged.push({ id: current.id, name: current.name });
			} else {
				redefined.push({ id: current.id, name: current.name });
				await tx.redefine(current.id, job.schedule, job.firstRunAt);
			}
		}

		const removed = existing
			.filter((job) => !desiredNames.has(job.name))
			.map((job): ProvisionedJob => ({ id: job.id, name: job.name }));

		// A redefined rule's queued fires belong to its old definition.
		// A removed rule's whole job goes, and its tasks cascade with it.
		await tx.withdrawPendingTasks(redefined.map((job) => job.id));
		await tx.deleteJobs(removed.map((job) => job.id));

		// `insert` returns the new ids in `inserts` order, so zip them back to names.
		const insertedIds = await tx.insert(inserts);
		const inserted = inserts.map(
			(job, index): ProvisionedJob => ({ id: insertedIds[index], name: job.name }),
		);

		// After the redefined jobs' stale tasks are withdrawn, so the seeded ones are the last word.
		await seedFirstOccurrences(
			tx,
			[...inserted, ...redefined].map((job) => job.id),
			options,
			hooks,
		);

		return { inserted, redefined, unchanged, removed };
	});
}

/**
 * Clear a whole scope: delete all its jobs (their tasks cascade).
 */
export async function deprovision(
	runInTransaction: RunInDeprovisionTransaction,
): Promise<{ removed: number }> {
	return await runInTransaction(async (tx) => ({ removed: await tx.deleteAll() }));
}

/**
 * Record the first window of occurrences of the given jobs, and advance their clock.
 * Only a job that is enabled and has a live clock gets occurrences.
 */
async function seedFirstOccurrences(
	tx: ProvisionTransaction,
	jobIds: number[],
	options: MaterializerOptions,
	hooks: MaterializerHooks,
): Promise<void> {
	if (jobIds.length > 0) {
		await materialize(
			async (work) =>
				await work({
					// Claims these jobs whether they are due or not, with the liveness filter of a pass.
					claimDueJobs: async () => {
						const { now, jobs } = await tx.readJobs(jobIds);
						const live = jobs.filter((job) => job.enabled && job.nextRunAt !== null);
						return live.length > 0 ? { now, jobs: live } : undefined;
					},
					recordOccurrences: async (occurrences) => await tx.recordOccurrences(occurrences),
					retireSuperseded: async (superseded) => await tx.retireSuperseded(superseded),
					advanceJobs: async (planned) => await tx.advanceJobs(planned),
				}),
			options,
			hooks,
		);
	}
}

/**
 * Whether an existing job already holds the desired definition, clock liveness
 * included: a match needs nothing and, crucially, keeps its id.
 */
function holdsDefinition(current: ExistingJob, desired: DesiredJob): boolean {
	return (
		sameSchedule(current.schedule, desired.schedule) &&
		// The clock must be as alive (or deliberately dead) as the fresh plan.
		current.hasClock === (desired.firstRunAt !== null)
	);
}
