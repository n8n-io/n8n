import type { Schema } from '@/Interface';
import type { INodeExecutionData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useDataSchema } from '@/composables/useDataSchema';
import { executionDataToJson } from '@/utils/nodeTypesUtils';

export function getParentNodes() {
	const activeNode = useNDVStore().activeNode;
	const { getCurrentWorkflow, getNodeByName } = useWorkflowsStore();
	const workflow = getCurrentWorkflow();

	if (!activeNode || !workflow) return [];

	return workflow
		.getParentNodesByDepth(activeNode?.name)
		.filter(({ name }, i, nodes) => {
			return name !== activeNode.name && nodes.findIndex((node) => node.name === name) === i;
		})
		.map((n) => getNodeByName(n.name))
		.filter((n) => n !== null);
}

export function getSchemas() {
	const parentNodes = getParentNodes();
	const parentNodesNames = parentNodes.map((node) => node?.name);
	const { getSchemaForExecutionData, getInputDataWithPinned } = useDataSchema();
	const parentNodesSchemas: Array<{ nodeName: string; schema: Schema }> = parentNodes
		.map((node) => {
			const inputData: INodeExecutionData[] = getInputDataWithPinned(node);

			return {
				nodeName: node?.name || '',
				schema: getSchemaForExecutionData(executionDataToJson(inputData), true),
			};
		})
		.filter((node) => node.schema?.value.length > 0);

	const inputSchema = parentNodesSchemas.shift();

	return {
		parentNodesNames,
		inputSchema,
		parentNodesSchemas,
	};
}
