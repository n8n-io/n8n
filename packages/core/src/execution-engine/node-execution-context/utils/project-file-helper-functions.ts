import type {
	INode,
	IWorkflowExecuteAdditionalData,
	ProjectFileProxyFunctions,
	Workflow,
} from 'n8n-workflow';

export function getProjectFileHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
): Partial<ProjectFileProxyFunctions> {
	const projectFileProxyProvider = additionalData['project-files']?.projectFileProxyProvider;
	if (!projectFileProxyProvider) return {};

	return {
		getProjectFileProxy: async () =>
			await projectFileProxyProvider.getProjectFileProxy(workflow, node),
	};
}
