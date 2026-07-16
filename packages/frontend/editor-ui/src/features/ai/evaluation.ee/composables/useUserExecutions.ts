import type { ExecutionSummary } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

// A "user execution" is a successful run of the user's own graph. Evaluation-mode
// runs are excluded: their compiled runData doesn't match the user's graph, so it
// can't seed inputs — and after a few sessions the newest success would always be
// a compiled eval run. `id` is a string on real, persisted executions.
export function isUserExecution(execution: { mode?: string; id?: unknown }): boolean {
	return execution.mode !== 'evaluation' && typeof execution.id === 'string';
}

/**
 * Shared access to the current workflow's user executions, so the several
 * surfaces that seed test cases from a prior run apply the same "successful,
 * non-evaluation" rule instead of re-deriving it.
 */
export function useUserExecutions() {
	const executionsStore = useExecutionsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	/** Successful, non-evaluation executions for the workflow (newest first). */
	async function fetchUserExecutionCandidates(limit?: number): Promise<ExecutionSummary[]> {
		const workflowId = workflowDocumentStore.value?.workflowId;
		if (!workflowId) return [];
		const list = await executionsStore.fetchExecutions({ status: ['success'], workflowId });
		const candidates = list.results.filter(isUserExecution);
		return limit === undefined ? candidates : candidates.slice(0, limit);
	}

	/** The most recent user execution, fully loaded — or null when there is none. */
	async function fetchLatestUserExecution(): Promise<IExecutionResponse | null> {
		const workflowId = workflowDocumentStore.value?.workflowId;
		if (!workflowId) return null;
		const list = await executionsStore.fetchExecutions({ status: ['success'], workflowId });
		const candidate = list.results.find(isUserExecution);
		if (!candidate?.id) return null;
		return (await executionsStore.fetchExecution(candidate.id)) ?? null;
	}

	return { fetchUserExecutionCandidates, fetchLatestUserExecution };
}
