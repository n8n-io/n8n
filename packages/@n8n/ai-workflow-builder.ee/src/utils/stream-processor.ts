// ============================================================================
// IMPORTS
// ============================================================================

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import type { DynamicStructuredTool } from '@langchain/core/tools';

import type {
	AgentMessageChunk,
	ToolProgressChunk,
	WorkflowUpdateChunk,
	StreamOutput,
} from '../types/streaming';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BuilderToolBase {
	toolName: string;
	displayTitle: string;
	getCustomDisplayTitle?: (values: Record<string, unknown>) => string;
}

export interface BuilderTool extends BuilderToolBase {
	tool: DynamicStructuredTool;
}

/** Message content structure from LangGraph updates */
type MessageContent = { content: string | Array<{ type: string; text: string }> };

/** Stream event types from LangGraph */
type SubgraphEvent = [string[], string, unknown];
type ParentEvent = [string, unknown];
export type StreamEvent = SubgraphEvent | ParentEvent;

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Tools which should trigger canvas updates */
export const DEFAULT_WORKFLOW_UPDATE_TOOLS = [
	'add_nodes',
	'connect_nodes',
	'update_node_parameters',
	'remove_node',
];

/**
 * Parent graph nodes that should emit user-facing messages
 * - agent: V1 single agent (backward compatibility)
 * - responder: The ONLY node that should emit in multi-agent mode
 */
const EMITTING_NODES = ['agent', 'responder'];

/** Parent graph nodes to skip entirely (internal coordination) */
const SKIPPED_NODES = [
	'supervisor',
	'tools',
	'cleanup_dangling_tool_calls',
	'create_workflow_name',
	'auto_compact_messages',
	'configurator_subgraph',
	'discovery_subgraph',
	'builder_subgraph',
];

/**
 * Subgraph namespace prefixes that should not emit message events
 * Note: Actual namespaces have UUIDs appended like "builder_subgraph:612f4bc3-..."
 */
const SKIPPED_SUBGRAPH_PREFIXES = [
	'discovery_subgraph',
	'builder_subgraph',
	'configurator_subgraph',
];

// ============================================================================
// FILTERING LOGIC
// ============================================================================

/** Check if namespace indicates a skipped subgraph (handles UUID suffixes) */
function isFromSkippedSubgraph(namespace: string[]): boolean {
	return namespace.some((ns) => SKIPPED_SUBGRAPH_PREFIXES.some((prefix) => ns.startsWith(prefix)));
}

/** Check if a node name should be skipped */
function shouldSkipNode(nodeName: string): boolean {
	return SKIPPED_NODES.includes(nodeName);
}

/** Check if a node should emit messages */
function shouldEmitFromNode(nodeName: string): boolean {
	return EMITTING_NODES.includes(nodeName);
}

/** Check if node update contains message data */
function hasMessageInUpdate(update: unknown): boolean {
	const typed = update as { messages?: unknown[] };
	return Array.isArray(typed?.messages) && typed.messages.length > 0;
}

/** Determine if a subgraph update event should be filtered out */
function shouldFilterSubgraphUpdate(namespace: string[], data: Record<string, unknown>): boolean {
	if (!isFromSkippedSubgraph(namespace)) return false;

	return Object.entries(data).some(([nodeName, update]) => {
		if (shouldSkipNode(nodeName)) return false;
		return hasMessageInUpdate(update);
	});
}

/** Type guard for subgraph events */
function isSubgraphEvent(event: unknown): event is SubgraphEvent {
	return Array.isArray(event) && event.length === 3 && Array.isArray(event[0]);
}

/** Type guard for parent events */
function isParentEvent(event: unknown): event is ParentEvent {
	return Array.isArray(event) && event.length === 2 && typeof event[0] === 'string';
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

/** Extract message content from a node update */
function extractMessageContent(messages: MessageContent[]): string | null {
	if (messages.length === 0) return null;

	const lastMessage = messages[messages.length - 1];
	if (!lastMessage.content) return null;

	// Handle array content (multi-part messages)
	if (Array.isArray(lastMessage.content)) {
		const textContent = lastMessage.content
			.filter((c) => c.type === 'text')
			.map((c) => c.text)
			.join('\n');
		return textContent || null;
	}

	return lastMessage.content;
}

/**
 * Remove context tags from message content that are used for AI context
 * but shouldn't be displayed to users.
 *
 * This removes the entire context block from <current_workflow_json> through
 * </current_execution_nodes_schemas>
 */
export function cleanContextTags(text: string): string {
	return text.replace(/\n*<current_workflow_json>[\s\S]*?<\/current_execution_nodes_schemas>/, '');
}

// ============================================================================
// CHUNK PROCESSORS
// ============================================================================

/** Handle delete_messages node update */
function processDeleteMessages(update: unknown): StreamOutput | null {
	const typed = update as { messages?: MessageContent[] } | undefined;
	if (!typed?.messages?.length) return null;

	const messageChunk: AgentMessageChunk = {
		role: 'assistant',
		type: 'message',
		text: 'Deleted, refresh?',
	};
	return { messages: [messageChunk] };
}

/** Handle compact_messages node update */
function processCompactMessages(update: unknown): StreamOutput | null {
	const typed = update as { messages?: MessageContent[] } | undefined;
	if (!typed?.messages?.length) return null;

	const content = extractMessageContent(typed.messages);
	if (!content) return null;

	const messageChunk: AgentMessageChunk = {
		role: 'assistant',
		type: 'message',
		text: content,
	};
	return { messages: [messageChunk] };
}

/** Handle process_operations node update */
function processOperationsUpdate(update: unknown): StreamOutput | null {
	const typed = update as { workflowJSON?: unknown; workflowOperations?: unknown } | undefined;
	if (!typed?.workflowJSON || typed.workflowOperations === undefined) return null;

	const workflowUpdateChunk: WorkflowUpdateChunk = {
		role: 'assistant',
		type: 'workflow-updated',
		codeSnippet: JSON.stringify(typed.workflowJSON, null, 2),
	};
	return { messages: [workflowUpdateChunk] };
}

/** Handle agent node message update */
function processAgentNodeUpdate(nodeName: string, update: unknown): StreamOutput | null {
	if (!shouldEmitFromNode(nodeName)) return null;

	const typed = update as { messages?: MessageContent[] } | undefined;
	if (!typed?.messages?.length) return null;

	const content = extractMessageContent(typed.messages);
	// Filter out empty content and workflow context artifacts
	if (!content?.trim() || content.includes('<current_workflow_json>')) return null;

	const messageChunk: AgentMessageChunk = {
		role: 'assistant',
		type: 'message',
		text: content,
	};
	return { messages: [messageChunk] };
}

/** Handle custom tool progress chunk */
function processToolChunk(chunk: unknown): StreamOutput | null {
	const typed = chunk as ToolProgressChunk;
	if (typed?.type !== 'tool') return null;

	return { messages: [typed] };
}

// ============================================================================
// MAIN STREAM PROCESSOR
// ============================================================================

/** Process a single chunk from updates stream mode */
function processUpdatesChunk(nodeUpdate: Record<string, unknown>): StreamOutput | null {
	// Guard against null/undefined chunks
	if (!nodeUpdate || typeof nodeUpdate !== 'object') return null;

	// Special nodes first (backward compatibility)
	if (nodeUpdate.delete_messages) {
		return processDeleteMessages(nodeUpdate.delete_messages);
	}
	if (nodeUpdate.compact_messages) {
		return processCompactMessages(nodeUpdate.compact_messages);
	}
	if (nodeUpdate.process_operations) {
		return processOperationsUpdate(nodeUpdate.process_operations);
	}

	// Generic agent node handling
	for (const [nodeName, update] of Object.entries(nodeUpdate)) {
		if (shouldSkipNode(nodeName)) continue;

		const result = processAgentNodeUpdate(nodeName, update);
		if (result) return result;
	}

	return null;
}

/** Process a single chunk from the LangGraph stream */
export function processStreamChunk(streamMode: string, chunk: unknown): StreamOutput | null {
	if (streamMode === 'updates') {
		return processUpdatesChunk(chunk as Record<string, unknown>);
	}

	if (streamMode === 'custom') {
		return processToolChunk(chunk);
	}

	return null;
}

/** Process a subgraph event */
function processSubgraphEvent(event: SubgraphEvent): StreamOutput | null {
	const [namespace, streamMode, data] = event;

	// Filter out message updates from internal subgraphs
	if (
		streamMode === 'updates' &&
		shouldFilterSubgraphUpdate(namespace, data as Record<string, unknown>)
	) {
		return null;
	}

	return processStreamChunk(streamMode, data);
}

/** Process a parent graph event */
function processParentEvent(event: ParentEvent): StreamOutput | null {
	const [streamMode, chunk] = event;
	if (!streamMode || typeof streamMode !== 'string') return null;

	return processStreamChunk(streamMode, chunk);
}

/** Process a single event from the stream */
function processEvent(event: StreamEvent): StreamOutput | null {
	if (isSubgraphEvent(event)) {
		return processSubgraphEvent(event);
	}

	if (isParentEvent(event)) {
		return processParentEvent(event);
	}

	return null;
}

/**
 * Create a stream processor that yields formatted chunks
 *
 * Handles both regular graph events and subgraph events.
 * - Parent events: [streamMode, data]
 * - Subgraph events: [namespace[], streamMode, data]
 */
export async function* createStreamProcessor(
	stream: AsyncIterable<StreamEvent>,
): AsyncGenerator<StreamOutput> {
	for await (const event of stream) {
		const result = processEvent(event);
		if (result) {
			yield result;
		}
	}
}

// ============================================================================
// MESSAGE FORMATTING
// ============================================================================

/** Extract text from HumanMessage content (handles string and array formats) */
function extractHumanMessageText(content: HumanMessage['content']): string {
	if (typeof content === 'string') {
		return content;
	}

	if (Array.isArray(content)) {
		return content
			.filter(
				(c): c is { type: string; text: string } =>
					typeof c === 'object' && c !== null && 'type' in c && c.type === 'text' && 'text' in c,
			)
			.map((c) => c.text)
			.join('\n');
	}

	return '';
}

/** Format a HumanMessage into the expected output format */
function formatHumanMessage(msg: HumanMessage): Record<string, unknown> {
	const rawText = extractHumanMessageText(msg.content);
	const cleanedText = cleanContextTags(rawText);

	return {
		role: 'user',
		type: 'message',
		text: cleanedText,
	};
}

/** Process array content from AIMessage and return formatted text messages */
function processArrayContent(content: unknown[]): Array<Record<string, unknown>> {
	const textMessages = content.filter(
		(c): c is { type: string; text: string } =>
			typeof c === 'object' && c !== null && 'type' in c && c.type === 'text' && 'text' in c,
	);

	return textMessages.map((textMessage) => ({
		role: 'assistant',
		type: 'message',
		text: textMessage.text,
	}));
}

/** Process AIMessage content and return formatted messages */
function processAIMessageContent(msg: AIMessage): Array<Record<string, unknown>> {
	if (!msg.content) {
		return [];
	}

	if (Array.isArray(msg.content)) {
		return processArrayContent(msg.content);
	}

	return [
		{
			role: 'assistant',
			type: 'message',
			text: msg.content,
		},
	];
}

/** Create a formatted tool call message */
function createToolCallMessage(
	toolCall: ToolCall,
	builderTool?: BuilderToolBase,
): Record<string, unknown> {
	return {
		id: toolCall.id,
		toolCallId: toolCall.id,
		role: 'assistant',
		type: 'tool',
		toolName: toolCall.name,
		displayTitle: builderTool?.displayTitle,
		customDisplayTitle: toolCall.args && builderTool?.getCustomDisplayTitle?.(toolCall.args),
		status: 'completed',
		updates: [
			{
				type: 'input',
				data: toolCall.args || {},
			},
		],
	};
}

/** Process tool calls from AIMessage and return formatted tool messages */
function processToolCalls(
	toolCalls: ToolCall[],
	builderTools?: BuilderToolBase[],
): Array<Record<string, unknown>> {
	return toolCalls.map((toolCall) => {
		const builderTool = builderTools?.find((bt) => bt.toolName === toolCall.name);
		return createToolCallMessage(toolCall, builderTool);
	});
}

/** Process a ToolMessage and add its output to the corresponding tool call */
function processToolMessage(
	msg: ToolMessage,
	formattedMessages: Array<Record<string, unknown>>,
): void {
	const toolCallId = msg.tool_call_id;

	// Find the tool message by ID (search backwards for efficiency)
	for (let i = formattedMessages.length - 1; i >= 0; i--) {
		const m = formattedMessages[i];
		if (m.type === 'tool' && m.id === toolCallId) {
			// Add output to updates array
			m.updates ??= [];
			(m.updates as Array<Record<string, unknown>>).push({
				type: 'output',
				data: typeof msg.content === 'string' ? { result: msg.content } : msg.content,
			});
			break;
		}
	}
}

/** Format messages for frontend display */
export function formatMessages(
	messages: Array<AIMessage | HumanMessage | ToolMessage>,
	builderTools?: BuilderToolBase[],
): Array<Record<string, unknown>> {
	const formattedMessages: Array<Record<string, unknown>> = [];

	for (const msg of messages) {
		if (msg instanceof HumanMessage) {
			formattedMessages.push(formatHumanMessage(msg));
		} else if (msg instanceof AIMessage) {
			// Add AI message content
			formattedMessages.push(...processAIMessageContent(msg));

			// Add tool calls if present
			if (msg.tool_calls?.length) {
				formattedMessages.push(...processToolCalls(msg.tool_calls, builderTools));
			}
		} else if (msg instanceof ToolMessage) {
			processToolMessage(msg, formattedMessages);
		}
	}

	return formattedMessages;
}
