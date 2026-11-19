import type {
	INode,
	IWorkflowExecuteAdditionalData,
	TaskBoardProxyFunctions,
	Workflow,
} from 'n8n-workflow';

export function getTaskBoardHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
): Partial<TaskBoardProxyFunctions> {
	const taskBoardProxyProvider = additionalData['task-board']?.taskBoardProxyProvider;
	if (!taskBoardProxyProvider) return {};
	return {
		getTaskBoardProxy: async () => await taskBoardProxyProvider.getTaskBoardProxy(workflow, node),
	};
}
