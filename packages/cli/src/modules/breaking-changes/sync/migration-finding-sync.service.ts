import {
	MIGRATION_REPORT_TARGET_VERSION,
	type BreakingChangeVersion,
	type BreakingChangeWorkflowRuleResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, WorkflowRepository, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { ErrorReporter } from 'n8n-core';
import { createHash } from 'node:crypto';

import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import { BreakingChangeService } from '../breaking-changes.service';
import { MigrationFindingSyncRepository } from '../database/repositories/migration-finding-sync.repository';
import { MigrationFindingRepository } from '../database/repositories/migration-finding.repository';
import { diffMigrationFindings, type MigrationFindingHit } from './migration-finding-diff';

/** Stable hash of a rule set. The order of `ruleIds` does not change the result. */
export function computeRuleSetFingerprint(ruleIds: string[]): string {
	return createHash('sha256')
		.update([...ruleIds].sort().join('\n'))
		.digest('hex');
}

type ScanResult = 'complete' | 'partial' | 'lost';
type WaitOutcome = 'complete' | 'retry' | 'timeout';

/**
 * Brings the `migration_finding` table in step with detection results: a full
 * scan over every workflow, or a re-check of one workflow after it was saved.
 * The report routes read from the table, so they run the full sync first.
 *
 * Any main may run the full sync. The sync record is the lock: a main claims it
 * before it scans, and the others wait for the claim to complete and then read.
 */
@Service()
export class MigrationFindingSyncService {
	private static readonly BATCH_SIZE = 100;

	/** A claim older than this counts as abandoned, so a crashed sync does not block the table for good. */
	static readonly CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

	/** How long a request waits for another main's sync before it serves what is in the table. */
	static readonly WAIT_TIMEOUT_MS = 30 * 1000;

	static readonly WAIT_POLL_MS = 1000;

	/** In-flight runs per target version, so concurrent callers in this process share one run. */
	private readonly ongoingSyncs = new Map<BreakingChangeVersion, Promise<void>>();

	/** The latest re-check per workflow, so re-checks of one workflow run in save order. */
	private readonly ongoingWorkflowSyncs = new Map<string, Promise<void>>();

	constructor(
		private readonly breakingChangeService: BreakingChangeService,
		private readonly ruleRegistry: RuleRegistry,
		private readonly workflowRepository: WorkflowRepository,
		private readonly findingRepository: MigrationFindingRepository,
		private readonly syncRepository: MigrationFindingSyncRepository,
		private readonly txRunner: TransactionRunner,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('breaking-changes');
	}

	/**
	 * Syncs when the table has never been filled for the version, when the last
	 * sync did not complete, or when the registered rule set changed since the
	 * last sync (for example after an upgrade).
	 */
	async syncIfStale(targetVersion: BreakingChangeVersion): Promise<void> {
		// A read during a sync waits for it, so the table is never read mid-sync.
		const ongoing = this.ongoingSyncs.get(targetVersion);
		if (ongoing) {
			await ongoing;
			return;
		}

		const record = await this.syncRepository.getForVersion(targetVersion, {});
		if (
			record?.status === 'complete' &&
			record.ruleSetFingerprint === this.fingerprint(targetVersion)
		) {
			return;
		}

		this.logger.debug('Migration finding table is stale, syncing', {
			targetVersion,
			reason: record ? `last sync ${record.status}` : 'never synced',
		});
		await this.sync(targetVersion);
	}

	async sync(targetVersion: BreakingChangeVersion): Promise<void> {
		const ongoing = this.ongoingSyncs.get(targetVersion);
		if (ongoing) {
			this.logger.debug('Reusing ongoing migration finding sync', { targetVersion });
			return await ongoing;
		}

		const run = this.runSync(targetVersion);
		this.ongoingSyncs.set(targetVersion, run);
		try {
			await run;
		} finally {
			this.ongoingSyncs.delete(targetVersion);
		}
	}

	private async runSync(targetVersion: BreakingChangeVersion): Promise<void> {
		// The claim is the cross-main lock. The main that wins it scans and writes;
		// every other main waits for the record to leave `running`, then reads.
		// A run that fails elsewhere, or an abandoned claim, is retried here until the deadline.
		const deadline = Date.now() + MigrationFindingSyncService.WAIT_TIMEOUT_MS;
		let outcome: WaitOutcome;
		do {
			const claimedAt = new Date();
			const claimed = await this.syncRepository.tryClaim(
				targetVersion,
				this.fingerprint(targetVersion),
				claimedAt,
				new Date(claimedAt.getTime() - MigrationFindingSyncService.CLAIM_TIMEOUT_MS),
				{},
			);
			if (claimed) {
				await this.runClaimedSync(targetVersion, claimedAt);
				return;
			}

			this.logger.debug('Another instance is syncing migration findings, waiting for it', {
				targetVersion,
			});
			outcome = await this.waitForOtherSync(targetVersion, deadline);
		} while (outcome === 'retry');

		if (outcome === 'timeout') {
			this.logger.warn('Gave up waiting for another instance to sync migration findings', {
				targetVersion,
			});
		}
	}

	/** Runs the sync this instance holds the claim for, and records how it ended. */
	private async runClaimedSync(
		targetVersion: BreakingChangeVersion,
		claimedAt: Date,
	): Promise<void> {
		this.logger.debug('Starting migration finding sync', { targetVersion });
		let result: ScanResult;
		try {
			result = await this.scanAndWrite(targetVersion, claimedAt);
		} catch (error) {
			await this.syncRepository.markFailed(targetVersion, claimedAt, {});
			throw error;
		}

		if (result === 'lost') return;

		// The terminal update takes effect only while the record still carries this
		// claim, so a run that outlived its claim cannot overwrite the replacement's state.
		const recorded =
			result === 'complete'
				? await this.syncRepository.markComplete(targetVersion, claimedAt, new Date(), {})
				: await this.syncRepository.markFailed(targetVersion, claimedAt, {});
		if (!recorded) {
			this.logger.warn('Migration finding sync finished after its claim was taken over', {
				targetVersion,
			});
			return;
		}
		this.logger.debug(`Migration finding sync ${result}`, { targetVersion });
	}

	/**
	 * Scans every workflow and writes the table in batches. `partial` when a batch
	 * failed. `lost` when another run took the claim over, which stops the writes.
	 */
	private async scanAndWrite(
		targetVersion: BreakingChangeVersion,
		claimedAt: Date,
	): Promise<ScanResult> {
		// One full, uncached scan. Batch rules need every workflow to produce a result,
		// so the scan runs first and the table is updated from its output afterwards.
		const { report, failedChecks } = await this.breakingChangeService.detect(targetVersion);
		const hitsByWorkflow = groupHitsByWorkflow(report.workflowResults);

		// A rule check that threw leaves no hit for its pair. Treating that as "clean"
		// would mark a real finding fixed, so the diff leaves those pairs untouched.
		const unknownByWorkflow = groupByWorkflow(failedChecks);
		if (failedChecks.length > 0) {
			this.logger.warn('Leaving the findings of rule checks that failed during the scan as is', {
				targetVersion,
				count: failedChecks.length,
			});
		}

		// Page over every workflow, not only the affected ones, so findings
		// for workflows the scan no longer flags are marked fixed.
		// Keyset paging: a full page means there may be more, a short page ends it.
		const take = MigrationFindingSyncService.BATCH_SIZE;
		let afterId: string | undefined;
		let workflowIds: string[];
		let failedBatches = 0;
		do {
			workflowIds = await this.workflowRepository.getIdsAfter(afterId, take);

			// The scan can take long. A run whose claim was taken over must not write
			// over the replacement run, so the claim is checked again before every batch.
			if (!(await this.holdsClaim(targetVersion, claimedAt))) {
				this.logger.info('Stopping migration finding sync, another instance took the claim over', {
					targetVersion,
				});
				return 'lost';
			}

			try {
				await this.syncBatch(targetVersion, workflowIds, hitsByWorkflow, unknownByWorkflow);
			} catch (error) {
				// One bad batch must not lose the rest. The record is marked failed
				// afterwards, so the next read syncs and visits this batch again.
				failedBatches++;
				this.logger.warn('Migration finding sync batch failed, continuing with the next batch', {
					targetVersion,
					batchStart: workflowIds[0],
				});
				this.errorReporter.error(error, {
					extra: { targetVersion, batchStart: workflowIds[0] },
				});
			}
			afterId = workflowIds.at(-1);
		} while (workflowIds.length === take);

		if (failedBatches > 0) {
			this.logger.warn('Migration finding sync was partial, not recording it as complete', {
				targetVersion,
				failedBatches,
			});
			return 'partial';
		}
		return 'complete';
	}

	private async holdsClaim(
		targetVersion: BreakingChangeVersion,
		claimedAt: Date,
	): Promise<boolean> {
		const record = await this.syncRepository.getForVersion(targetVersion, {});
		return record?.status === 'running' && record.startedAt?.getTime() === claimedAt.getTime();
	}

	/**
	 * Polls the sync record until another instance's run has left `running`.
	 * `complete` means the table is current. `retry` means the run failed or its
	 * claim is old enough to count as abandoned, so the caller should claim it.
	 * `timeout` means the deadline passed: the caller serves the table as it is.
	 */
	private async waitForOtherSync(
		targetVersion: BreakingChangeVersion,
		deadline: number,
	): Promise<WaitOutcome> {
		while (Date.now() < deadline) {
			await sleep(MigrationFindingSyncService.WAIT_POLL_MS);
			const record = await this.syncRepository.getForVersion(targetVersion, {});
			if (record?.status === 'complete') return 'complete';
			if (record?.status !== 'running') return 'retry';
			const claimAge = Date.now() - (record.startedAt?.getTime() ?? 0);
			if (claimAge > MigrationFindingSyncService.CLAIM_TIMEOUT_MS) return 'retry';
		}
		return 'timeout';
	}

	private fingerprint(targetVersion: BreakingChangeVersion): string {
		return computeRuleSetFingerprint(
			this.ruleRegistry.getRules(targetVersion).map((rule) => rule.id),
		);
	}

	/**
	 * Re-checks one workflow and updates its findings in one transaction.
	 * It runs on whichever main handled the save: the write is small and scoped
	 * to one workflow, and a later full sync corrects any drift. The sync record
	 * marks a full scan, so this path never writes it.
	 * Errors are reported, not thrown, so the save that triggered it is unaffected.
	 */
	async syncWorkflow(workflowId: string): Promise<void> {
		// Saves of one workflow can overlap. Running their re-checks one after the
		// other keeps the table on the result of the latest save.
		const previous = this.ongoingWorkflowSyncs.get(workflowId) ?? Promise.resolve();
		const run = previous.then(async () => await this.runWorkflowSync(workflowId));
		this.ongoingWorkflowSyncs.set(workflowId, run);
		try {
			await run;
		} finally {
			if (this.ongoingWorkflowSyncs.get(workflowId) === run) {
				this.ongoingWorkflowSyncs.delete(workflowId);
			}
		}
	}

	private async runWorkflowSync(workflowId: string): Promise<void> {
		const targetVersion = MIGRATION_REPORT_TARGET_VERSION;
		if (!targetVersion) return;

		try {
			const { hits, failedChecks } = await this.breakingChangeService.detectWorkflowHits(
				targetVersion,
				workflowId,
			);
			// A batch rule decides from all workflows at once, so only a full sync
			// may change its rows. Here they are out of scope and stay as they are.
			const batchRulePairs = this.ruleRegistry
				.getRules(targetVersion)
				.filter((rule) => 'collectWorkflowData' in rule)
				.map((rule) => ({ ruleId: rule.id, workflowId }));
			await this.syncBatch(
				targetVersion,
				[workflowId],
				groupByWorkflow(hits),
				groupByWorkflow([...failedChecks, ...batchRulePairs]),
			);
		} catch (error) {
			this.logger.warn('Migration finding sync for one workflow failed', {
				targetVersion,
				workflowId,
			});
			this.errorReporter.error(error, { extra: { targetVersion, workflowId } });
		}
	}

	/** Reads, diffs, and writes one batch inside a single transaction. */
	private async syncBatch(
		targetVersion: BreakingChangeVersion,
		pagedIds: string[],
		hitsByWorkflow: Map<string, MigrationFindingHit[]>,
		unknownByWorkflow: Map<string, MigrationFindingHit[]>,
	): Promise<void> {
		if (pagedIds.length === 0) return;

		await this.txRunner.run({}, async (ctx: OperationContext) => {
			// A workflow deleted since its page was read can still have a scan hit.
			// A finding for it would break the foreign key, so the page is re-checked here.
			const workflowIds = await this.workflowRepository.findExistingIds(pagedIds, ctx);
			if (workflowIds.length === 0) return;

			const hits = workflowIds.flatMap((workflowId) => hitsByWorkflow.get(workflowId) ?? []);
			const unknown = workflowIds.flatMap((workflowId) => unknownByWorkflow.get(workflowId) ?? []);
			const existing = await this.findingRepository.listForWorkflows(
				targetVersion,
				workflowIds,
				ctx,
			);
			const diff = diffMigrationFindings({ targetVersion, workflowIds, hits, existing, unknown });

			if (diff.toInsert.length > 0) {
				await this.findingRepository.insertMany(diff.toInsert, ctx);
			}
			if (diff.toMarkFixed.length > 0) {
				await this.findingRepository.markFixedForIds(diff.toMarkFixed, ctx);
			}
			if (diff.toReopen.length > 0) {
				await this.findingRepository.updateStatusForIds(diff.toReopen, 'open', undefined, ctx);
			}
		});
	}
}

function groupHitsByWorkflow(
	workflowResults: BreakingChangeWorkflowRuleResult[],
): Map<string, MigrationFindingHit[]> {
	return groupByWorkflow(
		workflowResults.flatMap((result) =>
			result.affectedWorkflows.map((workflow) => ({
				ruleId: result.ruleId,
				workflowId: workflow.id,
			})),
		),
	);
}

function groupByWorkflow(pairs: MigrationFindingHit[]): Map<string, MigrationFindingHit[]> {
	const byWorkflow = new Map<string, MigrationFindingHit[]>();
	for (const pair of pairs) {
		const group = byWorkflow.get(pair.workflowId) ?? [];
		group.push(pair);
		byWorkflow.set(pair.workflowId, group);
	}
	return byWorkflow;
}
