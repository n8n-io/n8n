import type { PageSummary } from '@n8n/api-types';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import { useNodePagesStore } from '../nodePages.store';
import { byNewestUpdate } from '../pageSearch';

type TourCandidate = { page: PageSummary; nodeCount: number };

/** Counts, for each page, the nodes of the workflow that it links to. */
function toTourCandidates(pagesByNodeId: Record<string, PageSummary[]>): TourCandidate[] {
	const candidatesByPageId = Object.values(pagesByNodeId)
		.flat()
		.reduce(
			(candidates, page) =>
				candidates.set(page.id, {
					page,
					nodeCount: (candidates.get(page.id)?.nodeCount ?? 0) + 1,
				}),
			new Map<string, TourCandidate>(),
		);
	return [...candidatesByPageId.values()];
}

/** The page that links to the most nodes comes first. Among equals, the newest comes first. */
function byMostNodesThenNewest(a: TourCandidate, b: TourCandidate): number {
	return b.nodeCount - a.nodeCount || byNewestUpdate(a.page, b.page);
}

/**
 * Picks the page whose tour presents a workflow best: the page that links to the most of its nodes.
 * Returns `undefined` when no page links to a node of the workflow, and while the pages load.
 */
export function useWorkflowTourPage(
	workflowId: MaybeRefOrGetter<string>,
): ComputedRef<PageSummary | undefined> {
	const nodePagesStore = useNodePagesStore();

	return computed(() => {
		const isLoadedWorkflow = nodePagesStore.workflowId === toValue(workflowId);
		const candidates = isLoadedWorkflow ? toTourCandidates(nodePagesStore.pagesByNodeId) : [];
		return [...candidates].sort(byMostNodesThenNewest).at(0)?.page;
	});
}
