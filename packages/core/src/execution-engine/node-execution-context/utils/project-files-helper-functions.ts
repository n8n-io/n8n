import type {
	ProjectFilesProxyFunctions,
	INode,
	Workflow,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

export function getProjectFilesHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
): Partial<ProjectFilesProxyFunctions> {
	const projectFilesProxyProvider = additionalData['file-storage']?.projectFilesProxyProvider;
	if (!projectFilesProxyProvider) return {};
	return {
		getProjectFilesProxy: async () =>
			await projectFilesProxyProvider.getProjectFilesProxy(
				workflow,
				node,
				additionalData.projectFilesProjectId,
			),
	};
}
