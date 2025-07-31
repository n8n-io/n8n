import type {
	IDataStoreFunctions,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

export const getDataStoreFunctions = (
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
): IDataStoreFunctions => {
	return {
		async getDataStoreColumns(dataStoreId: string) {
			// @ts-ignore
			return additionalData.dataStoreService.getColumns(dataStoreId);
		},
		async listDataStores() {
			// @ts-ignore
			return additionalData.dataStoreService.getManyAndCount({});
		},
	};
};
