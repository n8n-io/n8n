import { computed, type ComputedRef } from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { isAiRootNodeType } from '../evaluation.constants';

export type AiRootNodeSummary = {
	name: string;
	type: string;
};

// AI root nodes in the current workflow, in canvas order. Used by step 2 of
// the evaluations wizard to (a) pick a sensible default and (b) populate the
// AI-node dropdown. Order matches `workflowDocumentStore.allNodes` so the
// "first AI node" is stable across re-renders.
export function useAiRootNodes(): ComputedRef<AiRootNodeSummary[]> {
	const workflowDocumentStore = injectWorkflowDocumentStore();

	return computed<AiRootNodeSummary[]>(() => {
		const allNodes = workflowDocumentStore.value?.allNodes ?? [];
		return allNodes
			.filter((node) => isAiRootNodeType(node.type))
			.map((node) => ({ name: node.name, type: node.type }));
	});
}
