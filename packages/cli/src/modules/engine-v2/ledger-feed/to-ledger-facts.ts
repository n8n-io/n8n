import {
	computeTimeSavedMinutes,
	type ExecutionLedgerEndedFacts,
	type ExecutionLedgerStartedFacts,
} from '@n8n/backend-services';
import type { EndedExecutionItem, ExecutionStatus, StartedExecutionItem } from '@n8n/engine';
import type { IWorkflowSettings, WorkflowExecutionSource } from 'n8n-workflow';

import { toV1Mode } from '@/executions/engine-v2-mapping';

const OUTCOME_BY_STATUS = {
	completed: 'success',
	failed: 'error',
	cancelled: 'canceled',
} as const satisfies Partial<Record<ExecutionStatus, ExecutionLedgerEndedFacts['outcome']>>;

const SOURCES: readonly string[] = ['user', 'instance_ai'] satisfies WorkflowExecutionSource[];

function toSource(source: string | null): WorkflowExecutionSource | undefined {
	return source !== null && SOURCES.includes(source)
		? (source as WorkflowExecutionSource)
		: undefined;
}

function toTimeSavedSettings(
	item: EndedExecutionItem,
): Pick<IWorkflowSettings, 'timeSavedMode' | 'timeSavedPerExecution'> {
	return {
		timeSavedMode: item.timeSavedMode === 'dynamic' ? 'dynamic' : 'fixed',
		timeSavedPerExecution: item.timeSavedPerExecution ?? undefined,
	};
}

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
	// The engine has no crashed status: the sweep fails a stalled run.
	const outcome = item.endedBySweep
		? 'crashed'
		: OUTCOME_BY_STATUS[item.status as keyof typeof OUTCOME_BY_STATUS];
	const finishedAt = new Date(item.finishedAt);
	const mode = toV1Mode(item);
	const source = toSource(item.source);

	return {
		executionId: item.id,
		workflowId: item.workflowId,
		workflowName: item.workflowName ?? '',
		mode,
		source,
		projectId: ownProjectId(item),
		occurredAt: finishedAt,
		origin: 'v2',
		outcome,
		runtimeMs: finishedAt.getTime() - new Date(item.startedAt).getTime(),
		timeSavedMin:
			computeTimeSavedMinutes({
				fact: { entityType: 'workflow', mode, source: source ?? 'none', event: 'ended', outcome },
				settings: toTimeSavedSettings(item),
				nodeTimeSavedMinutes: item.dynamicTimeSavedMin,
			}) ?? 0,
	};
}
