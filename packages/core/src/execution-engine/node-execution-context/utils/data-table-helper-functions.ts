import type {
	DataTableProxyFunctions,
	INode,
	Workflow,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

export function getDataTableHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
): Partial<DataTableProxyFunctions> {
	const dataTableProxyProvider = additionalData['data-table']?.dataTableProxyProvider;
	if (!dataTableProxyProvider) return {};
	return {
		getDataTableAggregateProxy: async () =>
			await dataTableProxyProvider.getDataTableAggregateProxy(
				workflow,
				node,
				additionalData.dataTableProjectId,
			),
		getDataTableProxy: async (dataTableId: string) =>
			await dataTableProxyProvider.getDataTableProxy(
				workflow,
				node,
				dataTableId,
				additionalData.dataTableProjectId,
			),
	};
}
