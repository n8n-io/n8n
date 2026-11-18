import type {
	DataTableProxyFunctions,
	INode,
	IRunExecutionData,
	Workflow,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

export function getDataTableHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
	runExecutionData?: IRunExecutionData | null,
	mode?: WorkflowExecuteMode,
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
				// Read per call: the identity can be stamped after the context is built.
				// An error workflow keeps the failed run's user for redaction only.
				mode === 'error'
					? undefined
					: runExecutionData?.executionData?.runtimeData?.executedByUserId,
			),
	};
}
