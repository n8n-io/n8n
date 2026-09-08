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
// Cap on how many pages we walk looking for user executions. The list endpoint
// pages ~10 at a time, so this covers ~200 recent runs — enough to look past a
// streak of evaluation runs without unbounded paging on a huge history.
const MAX_PAGES = 20;

export function useUserExecutions() {
	const executionsStore = useExecutionsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	// Walk successful executions newest-first, one page at a time via `lastId`,
	// invoking `onPage` until it returns a value or the history is exhausted.
	// Evaluation runs can fill many pages, so a single page isn't enough to know
	// whether a user run exists.
	async function scanUserExecutions<T>(
		onPage: (users: ExecutionSummary[]) => T | undefined,
	): Promise<T | undefined> {
		const workflowId = workflowDocumentStore.value?.workflowId;
		if (!workflowId) return undefined;
		let lastId: string | undefined;
		let seen = 0;
		for (let page = 0; page < MAX_PAGES; page++) {
			const list = await executionsStore.fetchExecutions(
				{ status: ['success'], workflowId },
				lastId,
			);
			const rows = list.results;
			if (rows.length === 0) return undefined;
			seen += rows.length;
			const hit = onPage(rows.filter(isUserExecution));
			if (hit !== undefined) return hit;
			const oldest = rows[rows.length - 1]?.id;
			// Consumed the whole history, no total to page against, or no cursor to
			// advance — stop.
			if (!list.count || seen >= list.count || !oldest || oldest === lastId) return undefined;
			lastId = oldest;
		}
		return undefined;
	}

	/** Successful, non-evaluation executions for the workflow (newest first). */
	async function fetchUserExecutionCandidates(limit?: number): Promise<ExecutionSummary[]> {
		const collected: ExecutionSummary[] = [];
		await scanUserExecutions((users) => {
			collected.push(...users);
			// Stop once we have enough to satisfy the caller's limit.
			return limit !== undefined && collected.length >= limit ? true : undefined;
		});
		return limit === undefined ? collected : collected.slice(0, limit);
	}

	/** The most recent user execution, fully loaded — or null when there is none. */
	async function fetchLatestUserExecution(): Promise<IExecutionResponse | null> {
		const candidateId = await scanUserExecutions((users) => users[0]?.id);
		if (!candidateId) return null;
		return (await executionsStore.fetchExecution(candidateId)) ?? null;
	}

	return { fetchUserExecutionCandidates, fetchLatestUserExecution };
}
