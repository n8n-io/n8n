import type {
	ChatMemoryProxyFunctions,
	INode,
	Workflow,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

export function getChatMemoryHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
	workflow: Workflow,
	node: INode,
	mode: WorkflowExecuteMode,
): Partial<ChatMemoryProxyFunctions> {
	const chatMemoryProxyProvider = additionalData['chat-hub']?.chatMemoryProxyProvider;
	if (!chatMemoryProxyProvider) return {};

	const ownerId = mode !== 'manual' ? additionalData.userId : undefined;

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
				ownerId,
			),
	};
}
