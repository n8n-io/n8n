import type {
	ChatHubProxyFunctions,
	INode,
	Workflow,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

export function getChatHubHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
	mode: WorkflowExecuteMode,
): Partial<ChatHubProxyFunctions> {
	const chatHubProxyProvider = additionalData['chat-hub']?.chatHubProxyProvider;
	if (!chatHubProxyProvider) return {};

	const ownerId = mode !== 'manual' ? additionalData.userId : undefined;

	return {
		getChatHubProxy: async (
			sessionId: string,
			memoryNodeId: string,
			turnId: string | null,
			previousTurnIds: string[],
		) =>
			await chatHubProxyProvider.getChatHubProxy(
				workflow,
				node,
				sessionId,
				memoryNodeId,
				turnId,
				previousTurnIds,
				ownerId,
			),
	};
}
