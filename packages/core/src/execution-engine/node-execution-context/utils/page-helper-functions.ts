import type {
	INode,
	IWorkflowExecuteAdditionalData,
	PageProxyFunctions,
	Workflow,
} from 'n8n-workflow';

/** Returns no helper when no module provides pages. */
export function getPageHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
): PageProxyFunctions {
	const pageProxyProvider = additionalData.page?.pageProxyProvider;
	return pageProxyProvider
		? {
				getPageProxy: async () =>
					await pageProxyProvider.getPageProxy(workflow, node, additionalData.dataTableProjectId),
			}
		: {};
}
