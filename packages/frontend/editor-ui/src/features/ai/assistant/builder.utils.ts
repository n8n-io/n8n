import {
	hasRevertVersionId,
	type ChatRequest,
	type TextMessageWithRevertVersionId,
} from '@/features/ai/assistant/assistant.types';
import { useAIAssistantHelpers } from '@/features/ai/assistant/composables/useAIAssistantHelpers';
import { usePostHog } from '@/app/stores/posthog.store';
import { AI_BUILDER_TEMPLATE_EXAMPLES_EXPERIMENT } from '@/app/constants/experiments';
import type { IRunExecutionData } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import { getWorkflowVersionsByIds } from '@n8n/rest-api-client/api/workflowHistory';
import type { IRestApiContext } from '@n8n/rest-api-client';

export function generateShortId() {
	return Math.random().toString(36).substr(2, 9);
}

export function generateMessageId(): string {
	return `${Date.now()}-${generateShortId()}`;
}

export async function createBuilderPayload(
	text: string,
	id: string,
	options: {
		quickReplyType?: string;
		executionData?: IRunExecutionData['resultData'];
		workflow?: IWorkflowDb;
		nodesForSchema?: string[];
	} = {},
): Promise<ChatRequest.UserChatMessage> {
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
			workflowContext.expressionValues = await assistantHelpers.extractExpressionsFromWorkflow(
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
	};

	return {
		role: 'user',
		type: 'message',
		id,
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

/**
 * Extracts all revertVersionId values from an array of messages.
 * Only extracts from messages that have a string revertVersionId property.
 */
export function extractRevertVersionIds(messages: ChatRequest.MessageResponse[]): string[] {
	return messages.filter(hasRevertVersionId).map((msg) => msg.revertVersionId);
}

/**
 * Fetches which version IDs still exist in workflow history.
 * Returns a Map of versionId -> createdAt for existing versions.
 * Returns an empty map if the fetch fails (all versions will be treated as non-existent).
 */
export async function fetchExistingVersionIds(
	restApiContext: IRestApiContext,
	workflowId: string,
	versionIds: string[],
): Promise<Map<string, string>> {
	if (versionIds.length === 0) {
		return new Map();
	}

	try {
		const versionsResponse = await getWorkflowVersionsByIds(restApiContext, workflowId, versionIds);
		return new Map(versionsResponse.versions.map((v) => [v.versionId, v.createdAt]));
	} catch {
		// Continue without enriching - all revertVersionIds will be removed
		return new Map();
	}
}

/**
 * Removes revertVersionId from a TextMessage, returning a valid TextMessage.
 * Since revertVersionId is optional on TextMessage, the result is still a valid TextMessage.
 */
function removeRevertVersionId(msg: TextMessageWithRevertVersionId): ChatRequest.TextMessage {
	const { revertVersionId: _, ...rest } = msg;
	return rest;
}

/**
 * Enriches messages with revertVersion object containing both id and createdAt.
 * If version doesn't exist in the map, removes revertVersionId from the message.
 */
export function enrichMessagesWithRevertVersion(
	messages: ChatRequest.MessageResponse[],
	versionMap: Map<string, string>,
): ChatRequest.MessageResponse[] {
	return messages.map((msg) => {
		if (!hasRevertVersionId(msg)) {
			return msg;
		}

		const createdAt = versionMap.get(msg.revertVersionId);
		if (createdAt) {
			// Transform revertVersionId into revertVersion object
			return {
				...msg,
				revertVersion: { id: msg.revertVersionId, createdAt },
			};
		}

		// Version doesn't exist, remove revertVersionId
		return removeRevertVersionId(msg);
	});
}
