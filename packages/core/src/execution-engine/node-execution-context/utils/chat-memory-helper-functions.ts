import type {
	ChatMemoryProxyFunctions,
	INode,
	Workflow,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

export function getChatMemoryHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
): Partial<ChatMemoryProxyFunctions> {
	const chatMemoryProxyProvider = additionalData['chat-memory']?.chatMemoryProxyProvider;
	if (!chatMemoryProxyProvider) return {};

	return {
		getChatMemoryProxy: async (
			sessionId: string,
			turnId: string | null,
			previousTurnIds: string[],
		) =>
			await chatMemoryProxyProvider.getChatMemoryProxy(
				workflow,
				node,
				sessionId,
				turnId,
				previousTurnIds,
			),
	};
}
