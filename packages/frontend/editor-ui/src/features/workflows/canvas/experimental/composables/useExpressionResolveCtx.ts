import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import { computed, type ComputedRef } from 'vue';

export function useExpressionResolveCtx(node: ComputedRef<INodeUi | null | undefined>) {
	const workflowsStore = useWorkflowsStore();

	const workflowDocumentStore = injectWorkflowDocumentStore();

	return computed<ExpressionLocalResolveContext | undefined>(() => {
		if (!node.value || !workflowDocumentStore.value) {
			return undefined;
		}

		const runIndex = 0; // not changeable for now
		const execution = workflowsStore.workflowExecutionData;
		const nodeName = node.value.name;

		function findInputNode(): ExpressionLocalResolveContext['inputNode'] {
			const taskData = (execution?.data?.resultData.runData[nodeName] ?? [])[runIndex];
			const source = taskData?.source[0];

			if (source) {
				return {
					name: source.previousNode,
					branchIndex: source.previousNodeOutput ?? 0,
					runIndex: source.previousNodeRun ?? 0,
				};
			}

			const inputs = workflowDocumentStore.value.getParentNodesByDepth(nodeName, 1);

			if (inputs.length > 0) {
				return {
					name: inputs[0].name,
					branchIndex: inputs[0].indicies[0] ?? 0,
					runIndex: 0,
				};
			}

			return undefined;
		}

		return {
			localResolve: true,
			nodeName,
			additionalKeys: {},
			inputNode: findInputNode(),
		};
	});
}
