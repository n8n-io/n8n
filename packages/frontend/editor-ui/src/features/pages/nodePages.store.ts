import type { PageNodeReferences, PageSummary } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { byNewestUpdate } from './pageSearch';

type PagesByNodeId = Record<string, PageSummary[]>;

function toPagesByNodeId(references: PageNodeReferences[]): PagesByNodeId {
	return Object.fromEntries(
		references.map(({ nodeId, pages }) => [nodeId, [...pages].sort(byNewestUpdate)]),
	);
}

/** Holds the pages that link to each node of one workflow, the workflow of the last `refresh`. */
export const useNodePagesStore = defineStore('nodePages', () => {
	const pageStore = usePageStore();
	const workflowId = ref<string>();
	const pagesByNodeId = ref<PagesByNodeId>({});

	/**
	 * Loads the pages that link to the nodes of a workflow, with one request.
	 * The nodes of another workflow have no pages from the start of the call.
	 * A failed load keeps the last pages of the workflow.
	 */
	async function refresh(requestedWorkflowId: string): Promise<void> {
		if (workflowId.value !== requestedWorkflowId) {
			workflowId.value = requestedWorkflowId;
			pagesByNodeId.value = {};
		}
		try {
			const references = await pageStore.listNodeReferences(requestedWorkflowId);
			// A slow answer for the previous workflow must not replace the pages of this one.
			if (workflowId.value === requestedWorkflowId) {
				pagesByNodeId.value = toPagesByNodeId(references);
			}
		} catch {
			// The pages are a secondary element of the canvas. A failure must not disturb it.
		}
	}

	/** Lists the pages that link to a node, newest first. A workflow that is not loaded has none. */
	function pagesOf(nodeWorkflowId: string, nodeId: string): PageSummary[] {
		const isLoadedWorkflow = workflowId.value === nodeWorkflowId;
		return (isLoadedWorkflow ? pagesByNodeId.value[nodeId] : undefined) ?? [];
	}

	return { workflowId, pagesByNodeId, refresh, pagesOf };
});
