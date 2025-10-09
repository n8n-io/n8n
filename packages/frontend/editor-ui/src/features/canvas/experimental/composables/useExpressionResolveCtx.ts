import type { INodeUi } from '@/Interface';
import useEnvironmentsStore from '@/features/environments.ee/environments.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ExpressionLocalResolveContext } from '@/types/expressions';
import type { Workflow } from 'n8n-workflow';
import { computed, type ComputedRef } from 'vue';

export function useExpressionResolveCtx(node: ComputedRef<INodeUi | null | undefined>) {
	const environmentsStore = useEnvironmentsStore();
	const workflowsStore = useWorkflowsStore();
	const workflowObject = computed(() => workflowsStore.workflowObject as Workflow);

	return computed<ExpressionLocalResolveContext | undefined>(() => {
		if (!node.value) {
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

			const inputs = workflowObject.value.getParentNodesByDepth(nodeName, 1);

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
			envVars: environmentsStore.variablesAsObject,
			workflow: workflowObject.value,
			execution,
			nodeName,
			additionalKeys: {},
			inputNode: findInputNode(),
			connections: workflowsStore.connectionsBySourceNode,
		};
	});
}
