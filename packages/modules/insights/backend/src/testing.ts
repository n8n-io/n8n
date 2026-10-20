import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
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

export async function collectInsights(ctx: WorkflowExecuteAfterContext) {
	await Container.get(InsightsCollectionService).handleWorkflowExecuteAfter(ctx);
}

/** Module `init()` registers the participant, but test module loading does not run `init()`. */
export async function registerInsightsLedgerParticipant() {
	await import('./insights-ledger.participant.js');
}

export async function flushInsights() {
	await Container.get(InsightsCollectionService).flushEvents();
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
