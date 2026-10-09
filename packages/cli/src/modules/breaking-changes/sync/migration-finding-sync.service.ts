import {
	MIGRATION_REPORT_TARGET_VERSION,
	type BreakingChangeVersion,
	type BreakingChangeWorkflowRuleResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, WorkflowRepository, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { createHash } from 'node:crypto';

import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import { BreakingChangeService } from '../breaking-changes.service';
import { MigrationFindingSyncRepository } from '../database/repositories/migration-finding-sync.repository';
import { MigrationFindingRepository } from '../database/repositories/migration-finding.repository';
import { MigrationWorkflowOwnerRepository } from '../database/repositories/migration-workflow-owner.repository';
import { MigrationOwnerSuggestionService } from '../owners/migration-owner-suggestion.service';
import { diffMigrationFindings, type MigrationFindingHit } from './migration-finding-diff';

/** Stable hash of a rule set. The order of `ruleIds` does not change the result. */
export function computeRuleSetFingerprint(ruleIds: string[]): string {
	return createHash('sha256')
		.update([...ruleIds].sort().join('\n'))
		.digest('hex');
}

/**
 * Brings the `migration_finding` table in step with detection results: a full
 * scan over every workflow, or a re-check of one workflow after it was saved.
 * The report routes read from the table, so they run the full sync first.
 */
@Service()
export class MigrationFindingSyncService {
	private static readonly BATCH_SIZE = 100;

	/** In-flight runs per target version, so concurrent callers share one scan. */
	private readonly ongoingSyncs = new Map<BreakingChangeVersion, Promise<void>>();

	/** The latest re-check per workflow, so re-checks of one workflow run in save order. */
	private readonly ongoingWorkflowSyncs = new Map<string, Promise<void>>();

	constructor(
		private readonly breakingChangeService: BreakingChangeService,
		private readonly ruleRegistry: RuleRegistry,
		private readonly workflowRepository: WorkflowRepository,
		private readonly findingRepository: MigrationFindingRepository,
		private readonly syncRepository: MigrationFindingSyncRepository,
		private readonly ownerSuggestionService: MigrationOwnerSuggestionService,
		private readonly ownerRepository: MigrationWorkflowOwnerRepository,
		private readonly txRunner: TransactionRunner,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('breaking-changes');
	}

	/**
	 * Syncs when the table has never been filled for the version, or when the
	 * registered rule set changed since the last sync (for example after an upgrade).
	 */
	async syncIfStale(targetVersion: BreakingChangeVersion): Promise<void> {
		// A read during a sync waits for it, so the table is never read mid-sync.
		const ongoing = this.ongoingSyncs.get(targetVersion);
		if (ongoing) {
			await ongoing;
			return;
		}

		const record = await this.syncRepository.getForVersion(targetVersion, {});
		const ruleIds = this.ruleRegistry.getRules(targetVersion).map((rule) => rule.id);
		if (record?.ruleSetFingerprint === computeRuleSetFingerprint(ruleIds)) return;

		this.logger.debug('Migration finding table is stale, syncing', {
			targetVersion,
			reason: record ? 'rule set changed' : 'never synced',
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
		this.logger.debug('Starting migration finding sync', { targetVersion });

		// The record is written again only after every batch succeeded. A sync that stops
		// early (failed batch, error) leaves none, so the next read syncs again.
		await this.syncRepository.deleteForVersion(targetVersion, {});

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
			try {
				await this.syncBatch(targetVersion, workflowIds, hitsByWorkflow, unknownByWorkflow);
				await this.refreshSuggestedOwners(targetVersion, workflowIds);
			} catch (error) {
				// One bad batch must not lose the rest. The sync record stays cleared
				// below, so the next read syncs and visits this batch again.
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
			return;
		}

		const ruleIds = this.ruleRegistry.getRules(targetVersion).map((rule) => rule.id);
		await this.syncRepository.upsertForVersion(
			{
				targetVersion,
				syncedAt: new Date(),
				ruleSetFingerprint: computeRuleSetFingerprint(ruleIds),
			},
			{},
		);

		this.logger.debug('Migration finding sync completed', { targetVersion });
	}

	/**
	 * Re-checks one workflow and updates its findings in one transaction.
	 * It runs on whichever main handled the save. The write is small and scoped
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
			await this.refreshSuggestedOwners(targetVersion, [workflowId]);
		} catch (error) {
			this.logger.warn('Migration finding sync for one workflow failed', {
				targetVersion,
				workflowId,
			});
			this.errorReporter.error(error, { extra: { targetVersion, workflowId } });
		}
	}

	/**
	 * Stores the heuristic's owner for each workflow in the batch that has an open
	 * finding, and drops the suggestion of the others. An owner a person assigned
	 * is kept. Owners are a hint, so a failure here does not fail the finding sync.
	 */
	private async refreshSuggestedOwners(
		targetVersion: BreakingChangeVersion,
		workflowIds: string[],
	): Promise<void> {
		try {
			const affectedIds = await this.findingRepository.listWorkflowIdsWithOpenFindings(
				targetVersion,
				workflowIds,
				{},
			);
			const suggestions =
				affectedIds.length > 0 ? await this.ownerSuggestionService.suggestOwners(affectedIds) : [];
			await this.ownerRepository.replaceSuggestions(workflowIds, suggestions, {});
		} catch (error) {
			this.logger.warn('Refreshing the suggested owners failed, the findings are unaffected', {
				targetVersion,
				batchStart: workflowIds[0],
			});
			this.errorReporter.error(error, { extra: { targetVersion, batchStart: workflowIds[0] } });
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
