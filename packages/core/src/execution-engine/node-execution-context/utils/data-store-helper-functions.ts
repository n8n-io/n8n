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
	const dataStoreProxyProvider = additionalData['data-table']?.dataStoreProxyProvider;
	if (!dataStoreProxyProvider) return {};
	return {
		getDataStoreAggregateProxy: async () =>
			await dataStoreProxyProvider.getDataStoreAggregateProxy(
				workflow,
				node,
				additionalData.dataTableProjectId,
			),
		getDataStoreProxy: async (dataStoreId: string) =>
			await dataStoreProxyProvider.getDataStoreProxy(
				workflow,
				node,
				dataStoreId,
				additionalData.dataTableProjectId,
			),
	};
}
