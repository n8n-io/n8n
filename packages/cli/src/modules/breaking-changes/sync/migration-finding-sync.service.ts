import type { BreakingChangeVersion, BreakingChangeWorkflowRuleResult } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, WorkflowRepository, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { createHash } from 'node:crypto';

import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import { BreakingChangeService } from '../breaking-changes.service';
import { MigrationFindingSyncRepository } from '../database/repositories/migration-finding-sync.repository';
import { MigrationFindingRepository } from '../database/repositories/migration-finding.repository';
import { diffMigrationFindings, type MigrationFindingHit } from './migration-finding-diff';

/** Stable hash of a rule set. The order of `ruleIds` does not change the result. */
export function computeRuleSetFingerprint(ruleIds: string[]): string {
	return createHash('sha256').update([...ruleIds].sort().join('\n')).digest('hex');
}

/**
 * Brings the `migration_finding` table in step with a fresh detection scan.
 * Nothing calls it yet; a later change schedules it and serves the report from the table.
 */
@Service()
export class MigrationFindingSyncService {
	private static readonly BATCH_SIZE = 100;

	/** In-flight runs per target version, so concurrent callers share one scan. */
	private readonly ongoingSyncs = new Map<BreakingChangeVersion, Promise<void>>();

	constructor(
		private readonly breakingChangeService: BreakingChangeService,
		private readonly ruleRegistry: RuleRegistry,
		private readonly workflowRepository: WorkflowRepository,
		private readonly findingRepository: MigrationFindingRepository,
		private readonly syncRepository: MigrationFindingSyncRepository,
		private readonly txRunner: TransactionRunner,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = logger.scoped('breaking-changes');
	}

	async sync(targetVersion: BreakingChangeVersion): Promise<void> {
		// Only the leader writes, so followers in a multi-main setup do not race on the table.
		if (!this.instanceSettings.isLeader) {
			this.logger.debug('Skipping migration finding sync on a non-leader instance', {
				targetVersion,
			});
			return;
		}

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

		// One full, uncached scan. Batch rules need every workflow to produce a result,
		// so the scan runs first and the table is updated from its output afterwards.
		const { report } = await this.breakingChangeService.detect(targetVersion);
		const hitsByWorkflow = groupHitsByWorkflow(report.workflowResults);

		// Page over every workflow, not only the affected ones, so findings
		// for workflows the scan no longer flags are marked fixed.
		const take = MigrationFindingSyncService.BATCH_SIZE;
		for (let skip = 0; ; skip += take) {
			const workflowIds = await this.workflowRepository.getIdsPage({ skip, take });
			if (workflowIds.length === 0) break;

			await this.syncBatch(targetVersion, workflowIds, hitsByWorkflow);
			if (workflowIds.length < take) break;
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

	/** Reads, diffs, and writes one batch inside a single transaction. */
	private async syncBatch(
		targetVersion: BreakingChangeVersion,
		workflowIds: string[],
		hitsByWorkflow: Map<string, MigrationFindingHit[]>,
	): Promise<void> {
		const hits = workflowIds.flatMap((workflowId) => hitsByWorkflow.get(workflowId) ?? []);

		await this.txRunner.run({}, async (ctx: OperationContext) => {
			const existing = await this.findingRepository.listForWorkflows(
				targetVersion,
				workflowIds,
				ctx,
			);
			const diff = diffMigrationFindings({ targetVersion, workflowIds, hits, existing });

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
	const hitsByWorkflow = new Map<string, MigrationFindingHit[]>();
	for (const result of workflowResults) {
		for (const workflow of result.affectedWorkflows) {
			const hits = hitsByWorkflow.get(workflow.id) ?? [];
			hits.push({ ruleId: result.ruleId, workflowId: workflow.id });
			hitsByWorkflow.set(workflow.id, hits);
		}
	}
	return hitsByWorkflow;
}
