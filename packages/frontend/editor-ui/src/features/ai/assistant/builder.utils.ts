import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import { useAIAssistantHelpers } from '@/features/ai/assistant/composables/useAIAssistantHelpers';
import type { IRunExecutionData } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';

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
	const workflowContext: ChatRequest.WorkflowContext = {};

	if (options.workflow) {
		workflowContext.currentWorkflow = {
			...assistantHelpers.simplifyWorkflowForAssistant(options.workflow),
			id: options.workflow.id,
		};
	}

	if (options.executionData) {
		workflowContext.executionData = assistantHelpers.simplifyResultData(options.executionData, {
			compact: true,
		});

		if (options.workflow) {
			// Extract and include expression values with their resolved values
			// Pass execution data to only extract from nodes that have executed
			workflowContext.expressionValues = assistantHelpers.extractExpressionsFromWorkflow(
				options.workflow,
				options.executionData,
			);
		}
	}

	if (options.nodesForSchema?.length) {
		workflowContext.executionSchema = assistantHelpers.getNodesSchemas(
			options.nodesForSchema,
			true,
		);
	}

	// add active node as context
	const { activeNode } = useNDVStore();
	const context: ChatRequest.UserContext = {};
	if (activeNode) {
		context.activeNodeInfo = {
			node: activeNode,
			nodeIssues: activeNode.issues,
		};
	}
	console.log('active node?', context, activeNode);

	return {
		role: 'user',
		type: 'message',
		text,
		quickReplyType: options.quickReplyType,
		context,
		workflowContext,
	};
}

export function shouldShowChat(routeName: string): boolean {
	const ENABLED_VIEWS = ['workflow', 'workflowExecution'];
	return ENABLED_VIEWS.includes(routeName);
}
