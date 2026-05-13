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
	const boardProxyProvider = additionalData['data-table']?.boardProxyProvider;

	const helpers: Partial<DataTableProxyFunctions> = {};

	if (dataTableProxyProvider) {
		helpers.getDataTableAggregateProxy = async () =>
			await dataTableProxyProvider.getDataTableAggregateProxy(
				workflow,
				node,
				additionalData.dataTableProjectId,
			);
		helpers.getDataTableProxy = async (dataTableId: string) =>
			await dataTableProxyProvider.getDataTableProxy(
				workflow,
				node,
				dataTableId,
				additionalData.dataTableProjectId,
			);
	}

	if (boardProxyProvider) {
		helpers.getBoardProxy = async (boardId: string) =>
			await boardProxyProvider.getBoardProxy(
				workflow,
				node,
				boardId,
				additionalData.dataTableProjectId,
			);
	}

	return helpers;
}
