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
): Partial<DataStoreProxyFunctions> {
	if (additionalData.dataStoreProxyProvider === undefined) return {};
	const dataStoreProxyProvider = additionalData.dataStoreProxyProvider;
	return {
		getDataStoreAggregateProxy: async () =>
			await dataStoreProxyProvider.getDataStoreAggregateProxy(workflow, node),
		getDataStoreProxy: async (dataStoreId: string) =>
			await dataStoreProxyProvider.getDataStoreProxy(workflow, node, dataStoreId),
	};
}
