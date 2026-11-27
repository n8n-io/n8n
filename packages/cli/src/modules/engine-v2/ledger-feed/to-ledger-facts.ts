import type { ExecutionLedgerEndedFacts, ExecutionLedgerStartedFacts } from '@n8n/backend-services';
import type { EndedExecutionItem, ExecutionStatus, StartedExecutionItem } from '@n8n/engine';

import { toV1Mode } from '@/executions/engine-v2-mapping';

const OUTCOME_BY_STATUS = {
	completed: 'success',
	failed: 'error',
	cancelled: 'canceled',
} as const satisfies Partial<Record<ExecutionStatus, ExecutionLedgerEndedFacts['outcome']>>;

/**
 * A sub-execution inherits the caller context of its parent, so its project is the
 * project of the parent. v1 counts a sub-workflow run in its own project, so the writer
 * looks the project up from the workflow.
 */
function ownProjectId(item: { parent: unknown; projectId: string | null }) {
	return item.parent ? undefined : (item.projectId ?? undefined);
}

export function toStartedFacts(item: StartedExecutionItem): ExecutionLedgerStartedFacts {
	return {
		executionId: item.id,
		workflowId: item.workflowId,
		workflowName: item.workflowName ?? '',
		mode: toV1Mode(item),
		projectId: ownProjectId(item),
		occurredAt: new Date(item.createdAt),
		origin: 'v2',
	};
}

/** Undefined for a status that is not an end. The feed only gives ended rows. */
export function toEndedFacts(item: EndedExecutionItem): ExecutionLedgerEndedFacts | undefined {
	if (!(item.status in OUTCOME_BY_STATUS)) return undefined;
	const outcome = OUTCOME_BY_STATUS[item.status as keyof typeof OUTCOME_BY_STATUS];
	const finishedAt = new Date(item.finishedAt);

	return {
		executionId: item.id,
		workflowId: item.workflowId,
		workflowName: item.workflowName ?? '',
		mode: toV1Mode(item),
		projectId: ownProjectId(item),
		occurredAt: finishedAt,
		origin: 'v2',
		outcome,
		runtimeMs: finishedAt.getTime() - new Date(item.createdAt).getTime(),
		timeSavedMin: 0,
	};
}
