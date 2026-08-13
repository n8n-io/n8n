import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import { END, isCommand, isGraphInterrupt } from '@langchain/langgraph';

import { stripAllCacheControlMarkers } from './cache-control';
import { isBaseMessage } from '../types/langchain';
import type { WorkflowMetadata } from '../types/tools';
import type { WorkflowOperation } from '../types/workflow';

export interface FetchedUrlContentItem {
	url: string;
	status: 'success' | 'error';
	title: string;
	content: string;
}

interface CommandUpdate {
	messages?: BaseMessage[];
	workflowOperations?: WorkflowOperation[];
	templateIds?: number[];
	cachedTemplates?: WorkflowMetadata[];
	bestPractices?: string;
	approvedDomains?: string[];
	webFetchCount?: number;
	allDomainsApproved?: boolean;
	fetchedUrlContent?: FetchedUrlContentItem[];
}

/**
 * Check that an optional field, if present, has the expected type.
 */
function hasValidOptionalField(
	obj: Record<string, unknown>,
	key: string,
	check: 'array' | 'string' | 'number' | 'boolean',
): boolean {
	if (!(key in obj) || obj[key] === undefined) return true;
	switch (check) {
		case 'array':
			return Array.isArray(obj[key]);
		case 'string':
			return typeof obj[key] === 'string';
		case 'number':
			return typeof obj[key] === 'number';
		case 'boolean':
			return typeof obj[key] === 'boolean';
	}
}

/**
 * Type guard to check if an object has the shape of CommandUpdate
 */
function isCommandUpdate(value: unknown): value is CommandUpdate {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		hasValidOptionalField(obj, 'messages', 'array') &&
		hasValidOptionalField(obj, 'workflowOperations', 'array') &&
		hasValidOptionalField(obj, 'templateIds', 'array') &&
		hasValidOptionalField(obj, 'cachedTemplates', 'array') &&
		hasValidOptionalField(obj, 'bestPractices', 'string') &&
		hasValidOptionalField(obj, 'approvedDomains', 'array') &&
		hasValidOptionalField(obj, 'webFetchCount', 'number') &&
		hasValidOptionalField(obj, 'allDomainsApproved', 'boolean') &&
		hasValidOptionalField(obj, 'fetchedUrlContent', 'array')
	);
}

interface CollectedToolResults {
	messages: BaseMessage[];
	operations: WorkflowOperation[];
	templateIds: number[];
	cachedTemplates: WorkflowMetadata[];
	bestPractices?: string;
	approvedDomains: string[];
	webFetchCount?: number;
	allDomainsApproved?: boolean;
	fetchedUrlContent: FetchedUrlContentItem[];
}

function collectToolResults(toolResults: unknown[]): CollectedToolResults {
	const collected: CollectedToolResults = {
		messages: [],
		operations: [],
		templateIds: [],
		cachedTemplates: [],
		approvedDomains: [],
		fetchedUrlContent: [],
	};

	for (const result of toolResults) {
		if (isCommand(result) && isCommandUpdate(result.update)) {
			mergeCommandUpdate(collected, result.update);
		} else if (isBaseMessage(result)) {
			collected.messages.push(result);
		}
	}
	return collected;
}

function mergeCommandUpdate(target: CollectedToolResults, update: CommandUpdate): void {
	if (update.messages) target.messages.push(...update.messages);
	if (update.workflowOperations) target.operations.push(...update.workflowOperations);
	if (update.templateIds) target.templateIds.push(...update.templateIds);
	if (update.cachedTemplates) target.cachedTemplates.push(...update.cachedTemplates);
	if (update.bestPractices) target.bestPractices = update.bestPractices;
	if (update.approvedDomains) target.approvedDomains.push(...update.approvedDomains);
	if (update.webFetchCount !== undefined) target.webFetchCount = update.webFetchCount;
	if (update.allDomainsApproved !== undefined)
		target.allDomainsApproved = update.allDomainsApproved;
	if (update.fetchedUrlContent) target.fetchedUrlContent.push(...update.fetchedUrlContent);
}

type SubgraphToolStateUpdate = {
	messages?: BaseMessage[];
	workflowOperations?: WorkflowOperation[] | null;
	templateIds?: number[];
	cachedTemplates?: WorkflowMetadata[];
	bestPractices?: string;
	approvedDomains?: string[];
	webFetchCount?: number;
	allDomainsApproved?: boolean;
	fetchedUrlContent?: FetchedUrlContentItem[];
};

function buildStateUpdate(collected: CollectedToolResults): SubgraphToolStateUpdate {
	const stateUpdate: SubgraphToolStateUpdate = {};
	if (collected.messages.length > 0) stateUpdate.messages = collected.messages;
	if (collected.operations.length > 0) stateUpdate.workflowOperations = collected.operations;
	if (collected.templateIds.length > 0) stateUpdate.templateIds = collected.templateIds;
	if (collected.cachedTemplates.length > 0) stateUpdate.cachedTemplates = collected.cachedTemplates;
	if (collected.bestPractices) stateUpdate.bestPractices = collected.bestPractices;
	if (collected.approvedDomains.length > 0) stateUpdate.approvedDomains = collected.approvedDomains;
	if (collected.webFetchCount !== undefined) stateUpdate.webFetchCount = collected.webFetchCount;
	if (collected.allDomainsApproved !== undefined)
		stateUpdate.allDomainsApproved = collected.allDomainsApproved;
	if (collected.fetchedUrlContent.length > 0)
		stateUpdate.fetchedUrlContent = collected.fetchedUrlContent;
	return stateUpdate;
}

/**
 * Execute tools in a subgraph node
 *
 * Adapts the executeToolsInParallel pattern for subgraph use.
 * Executes all tool calls from the last AI message in parallel.
 *
 * Tools that call interrupt() (like submit_questions) are handled naturally:
 * - On initial run: interrupt() throws GraphInterrupt, Promise.all rejects, graph pauses
 * - On resume: interrupt() returns the user's answers, all tools complete normally
 *
 * @param state - Subgraph state with messages array
 * @param toolMap - Map of tool name to tool instance
 * @returns State update with messages and optional operations
 */
export async function executeSubgraphTools(
	state: { messages: BaseMessage[] },
	toolMap: Map<string, StructuredTool>,
): Promise<SubgraphToolStateUpdate> {
	const lastMessage = state.messages[state.messages.length - 1];

	if (!lastMessage || !AIMessage.isInstance(lastMessage) || !lastMessage.tool_calls?.length) {
		return {};
	}

	// Execute all tools in parallel
	const toolResults = await Promise.all(
		lastMessage.tool_calls.map(async (toolCall) => {
			const tool = toolMap.get(toolCall.name);
			if (!tool) {
				return new ToolMessage({
					content: `Tool ${toolCall.name} not found`,
					tool_call_id: toolCall.id ?? '',
				});
			}

			try {
				const result: unknown = await tool.invoke(toolCall.args ?? {}, {
					toolCall: {
						id: toolCall.id,
						name: toolCall.name,
						args: toolCall.args ?? {},
					},
				});
				// Result can be a Command (with update) or a BaseMessage
				// We return it as-is and handle the type in the loop below
				return result;
			} catch (error) {
				// Let GraphInterrupt propagate - tools like submit_questions use interrupt() for HITL
				if (isGraphInterrupt(error)) {
					throw error;
				}
				return new ToolMessage({
					content: `Tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					tool_call_id: toolCall.id ?? '',
				});
			}
		}),
	);

	// Unwrap Command objects and collect state updates from tool results
	const collected = collectToolResults(toolResults);
	return buildStateUpdate(collected);
}

/**
 * Extract user request from parent state messages
 * Gets the LAST HumanMessage (most recent user request), not the first
 */
export function extractUserRequest(messages: BaseMessage[], defaultValue = ''): string {
	// Get the LAST HumanMessage (most recent user request for iteration support)
	// Skip resume messages to avoid treating plan decisions/answers as new requests.
	const humanMessages = messages.filter((m) => m instanceof HumanMessage);
	const lastNonResumeMessage = [...humanMessages]
		.reverse()
		.find((msg) => msg.additional_kwargs?.resumeData === undefined);
	const lastUserMessage = lastNonResumeMessage ?? humanMessages[humanMessages.length - 1];
	return typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : defaultValue;
}

/**
 * Standard shouldContinue logic for tool-based subgraphs
 * Checks presence of tool calls to determine if we should continue to tools node.
 */
export function createStandardShouldContinue() {
	return (state: { messages: BaseMessage[] }) => {
		const lastMessage = state.messages[state.messages.length - 1];
		const hasToolCalls =
			lastMessage &&
			'tool_calls' in lastMessage &&
			Array.isArray(lastMessage.tool_calls) &&
			lastMessage.tool_calls.length > 0;

		return hasToolCalls ? 'tools' : END;
	};
}

/**
 * Extract tool-related messages for persistence in parent state.
 * Filters messages to only include complete tool call/result pairs:
 * - AIMessages with tool_calls (to show which tools were called)
 * - ToolMessages (to show tool results)
 *
 * IMPORTANT: Only includes AIMessages with tool_calls if ALL of their
 * tool_calls have corresponding ToolMessages. This prevents orphaned
 * tool_use blocks that would cause Anthropic API errors.
 *
 * Excludes AIMessages with only text content (internal reasoning/summaries)
 * as user-facing output is handled by the responder subgraph.
 *
 * @param messages - Subgraph messages array
 * @returns Filtered array of tool-related messages for persistence
 */
export function extractToolMessagesForPersistence(messages: BaseMessage[]): BaseMessage[] {
	// Build a set of all tool_call_ids that have corresponding ToolMessages
	const completedToolCallIds = new Set<string>();
	for (const msg of messages) {
		if (ToolMessage.isInstance(msg) && msg.tool_call_id) {
			completedToolCallIds.add(msg.tool_call_id);
		}
	}

	const filtered = messages.filter((msg) => {
		if (ToolMessage.isInstance(msg)) {
			return true;
		}
		if (AIMessage.isInstance(msg) && msg.tool_calls && msg.tool_calls.length > 0) {
			// Only include AIMessage if ALL its tool_calls have completed ToolMessages
			return msg.tool_calls.every((tc) => tc.id && completedToolCallIds.has(tc.id));
		}
		return false;
	});

	// Strip cache_control markers from persisted messages to avoid exceeding
	// Anthropic's cache marker limit when these are loaded in subsequent requests
	stripAllCacheControlMarkers(filtered);

	return filtered;
}

/**
 * Filter out internal subgraph tool messages from the conversation.
 *
 * Subgraph tool messages (ToolMessages and AIMessages with tool_calls) are
 * persisted in parent state for frontend UI restoration, but they are not
 * relevant for agents like the supervisor or responder. Including them
 * wastes tokens and risks exceeding Anthropic's cache_control marker limit
 * if stale markers remain on those messages.
 *
 * @param messages - Parent graph messages array
 * @returns Messages with internal tool messages removed
 */
export function filterOutSubgraphToolMessages(messages: BaseMessage[]): BaseMessage[] {
	return messages.filter((msg) => {
		if (ToolMessage.isInstance(msg)) {
			return false;
		}
		if (AIMessage.isInstance(msg) && msg.tool_calls && msg.tool_calls.length > 0) {
			return false;
		}
		return true;
	});
}
