import type { ChatRequest } from '@/types/assistant.types';
import { useAIAssistantHelpers } from '@/composables/useAIAssistantHelpers';
import type { IRunExecutionData, NodeExecutionSchema } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';

export function generateMessageId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createBuilderPayload(
	text: string,
	options: {
		quickReplyType?: string;
		executionData?: IRunExecutionData['resultData'];
		workflow?: IWorkflowDb;
		nodesForSchema?: string[];
	} = {},
): ChatRequest.UserChatMessage {
	const assistantHelpers = useAIAssistantHelpers();
	const workflowContext: {
		currentWorkflow?: Partial<IWorkflowDb>;
		executionData?: IRunExecutionData['resultData'];
		executionSchema?: NodeExecutionSchema[];
	} = {};

	if (options.workflow) {
		workflowContext.currentWorkflow = {
			...assistantHelpers.simplifyWorkflowForAssistant(options.workflow),
			id: options.workflow.id,
		};
	}

	if (options.executionData) {
		workflowContext.executionData = assistantHelpers.simplifyResultData(options.executionData);
	}

	if (options.nodesForSchema?.length) {
		workflowContext.executionSchema = assistantHelpers.getNodesSchemas(
			options.nodesForSchema,
			true,
		);
	}

	return {
		role: 'user',
		type: 'message',
		text,
		quickReplyType: options.quickReplyType,
		workflowContext,
	};
}

export function shouldShowChat(routeName: string): boolean {
	const ENABLED_VIEWS = ['workflow', 'workflowExecution'];
	return ENABLED_VIEWS.includes(routeName);
}
