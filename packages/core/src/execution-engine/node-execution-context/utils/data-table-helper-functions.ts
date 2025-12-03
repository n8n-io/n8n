import type {
	DataTableProxyFunctions,
	INode,
	Workflow,
	IWorkflowExecuteAdditionalData,
	EventTriggerManagerProxy,
} from 'n8n-workflow';

export function getDataTableHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
): Partial<DataTableProxyFunctions & { eventTriggerManager: EventTriggerManagerProxy }> {
	const dtData = additionalData['data-table'];
	if (!dtData) return {};
	return {
		getDataTableAggregateProxy: async () =>
			await dtData.dataTableProxyProvider.getDataTableAggregateProxy(
				workflow,
				node,
				additionalData.dataTableProjectId,
			),
		getDataTableProxy: async (dataTableId: string) =>
			await dtData.dataTableProxyProvider.getDataTableProxy(
				workflow,
				node,
				dataTableId,
				additionalData.dataTableProjectId,
			),
		eventTriggerManager: {
			registerTrigger: (event: never, onEvent: never) =>
				dtData.eventTriggerManager.registerTrigger(workflow.id, event, onEvent),
		},
	};
}
