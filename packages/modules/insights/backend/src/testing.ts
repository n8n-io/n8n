import { FoldStepRegistry } from '@n8n/db';
import { Container } from '@n8n/di';

import { InsightsByPeriodRepository } from './insights-by-period.repository';
import { InsightsCollectionService } from './insights-collection.service';
import { InsightsCompactionService } from './insights-compaction.service';
import { InsightsLedgerFoldStep } from './insights-ledger.fold-step';
import { InsightsMetadataRepository } from './insights-metadata.repository';
import { InsightsRawRepository } from './insights-raw.repository';
import { InsightsService } from './insights.service';

export {
	createCompactedInsightsEvent,
	createMetadata,
	createRawInsightsEvent,
	createRawInsightsEvents,
} from './testing/db-utils';

export function initializeInsightsCollection() {
	Container.get(InsightsCollectionService).init();
}

export async function compactInsights(signal: AbortSignal) {
	return await Container.get(InsightsCompactionService).compactInsights(signal);
}

export async function getCompactedInsightsByWorkflow(workflowId: string) {
	return await Container.get(InsightsByPeriodRepository).find({
		where: { metadata: { workflowId } },
		relations: ['metadata'],
	});
}

/** Every `insights_raw` row with the workflow and project of its metadata. */
export async function readRawInsights() {
	const metadata = await Container.get(InsightsMetadataRepository).find();
	const byMetaId = new Map(metadata.map((row) => [row.metaId, row]));
	const raw = await Container.get(InsightsRawRepository).find();
	return raw.map((row) => ({
		workflowId: byMetaId.get(row.metaId)?.workflowId,
		workflowName: byMetaId.get(row.metaId)?.workflowName,
		projectId: byMetaId.get(row.metaId)?.projectId,
		type: row.type,
		value: Number(row.value),
	}));
}

export async function flushInsightsCollection() {
	await Container.get(InsightsCollectionService).flushEvents();
}

export function registerInsightsLedgerFoldStep() {
	Container.get(FoldStepRegistry).register(Container.get(InsightsLedgerFoldStep));
}

export async function getInsightsSummary(
	...args: Parameters<InsightsService['getInsightsSummary']>
) {
	return await Container.get(InsightsService).getInsightsSummary(...args);
}
