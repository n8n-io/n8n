import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import { useAIAssistantHelpers } from '@/features/ai/assistant/composables/useAIAssistantHelpers';
import { usePostHog } from '@/app/stores/posthog.store';
import {
	AI_BUILDER_MULTI_AGENT_EXPERIMENT,
	AI_BUILDER_TEMPLATE_EXAMPLES_EXPERIMENT,
} from '@/app/constants/experiments';
import type { IRunExecutionData } from 'n8n-workflow';
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
	const posthogStore = usePostHog();
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

	// Get feature flags from Posthog
	const featureFlags: ChatRequest.BuilderFeatureFlags = {
		templateExamples:
			posthogStore.getVariant(AI_BUILDER_TEMPLATE_EXAMPLES_EXPERIMENT.name) ===
			AI_BUILDER_TEMPLATE_EXAMPLES_EXPERIMENT.variant,
		multiAgent:
			posthogStore.getVariant(AI_BUILDER_MULTI_AGENT_EXPERIMENT.name) ===
			AI_BUILDER_MULTI_AGENT_EXPERIMENT.variant,
	};

	return {
		role: 'user',
		type: 'message',
		text,
		quickReplyType: options.quickReplyType,
		workflowContext,
		featureFlags,
	};
}

export function shouldShowChat(routeName: string): boolean {
	const ENABLED_VIEWS = ['workflow', 'workflowExecution'];
	return ENABLED_VIEWS.includes(routeName);
}
