import type {
	DataStoreProxyFunctions,
	INode,
	Workflow,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

export function getDataStoreHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
): DataStoreProxyFunctions {
	return {
		getDataStoreAggregateProxy: async () =>
			await additionalData.dataStoreProxyProvider.getDataStoreAggregateProxy(workflow, node),
		getDataStoreProxy: async (dataStoreId: string) =>
			await additionalData.dataStoreProxyProvider.getDataStoreProxy(workflow, node, dataStoreId),
	};
}
