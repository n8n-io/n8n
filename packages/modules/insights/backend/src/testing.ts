import { Container } from '@n8n/di';

import { InsightsByPeriodRepository } from './insights-by-period.repository';
import { InsightsCollectionService } from './insights-collection.service';
import { InsightsCompactionService } from './insights-compaction.service';

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
