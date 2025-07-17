import type { ChatRequest } from '@/types/assistant.types';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUsersStore } from '@/stores/users.store';
import { useAIAssistantHelpers } from '@/composables/useAIAssistantHelpers';
import type { IRunExecutionData } from 'n8n-workflow';

export function generateMessageId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createBuilderPayload(
	text: string,
	options: {
		quickReplyType?: string;
		executionData?: IRunExecutionData['resultData'];
	} = {},
): ChatRequest.UserChatMessage {
	const workflowsStore = useWorkflowsStore();
	const usersStore = useUsersStore();
	const assistantHelpers = useAIAssistantHelpers();

	const nodes = workflowsStore.workflow.nodes.map((node) => node.name);
	const schemas = assistantHelpers.getNodesSchemas(nodes);

	return {
		user: {
			firstName: usersStore.currentUser?.firstName ?? '',
		},
		question: text,
		quickReplyType: options.quickReplyType,
		// @ts-expect-error: Schema type mismatch with executionData
		executionData: schemas ?? {},
		workflowContext: {
			currentWorkflow: {
				...assistantHelpers.simplifyWorkflowForAssistant(workflowsStore.workflow),
				id: workflowsStore.workflowId,
			},
		},
	};
}

export function shouldShowChat(routeName: string): boolean {
	const ENABLED_VIEWS = ['workflow', 'workflowExecution'];
	return ENABLED_VIEWS.includes(routeName);
}
