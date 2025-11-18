import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import type { DynamicStructuredTool } from '@langchain/core/tools';

import type {
	AgentMessageChunk,
	ToolProgressChunk,
	WorkflowUpdateChunk,
	StreamOutput,
} from '../types/streaming';

export interface BuilderToolBase {
	toolName: string;
	displayTitle: string;
	getCustomDisplayTitle?: (values: Record<string, unknown>) => string;
}

export interface BuilderTool extends BuilderToolBase {
	tool: DynamicStructuredTool;
}

/**
 * Tools which should trigger canvas updates
 */
export const DEFAULT_WORKFLOW_UPDATE_TOOLS = [
	'add_nodes',
	'connect_nodes',
	'update_node_parameters',
	'remove_node',
];

/**
 * Multi-agent graph nodes that should emit messages to frontend
 *
 * Only emit user-facing responses:
 * - agent: V1 single agent (backward compatibility)
 * - responder: Conversational responses
 * - configurator: Final workflow setup response
 *
 * Internal agents (discovery, builder) are hidden - user sees tool execution via custom events
 */
const AGENT_NODES_TO_EMIT = [
	'agent', // V1 single agent (backward compatibility)
	'responder', // Conversational responses
	'configurator', // Final configuration responses
];

/**
 * Multi-agent graph nodes to skip (internal coordination)
 */
const NODES_TO_SKIP = [
	'supervisor', // Internal routing decisions
	'tools', // Tool execution handled via custom events
	'cleanup_dangling_tool_calls', // Internal cleanup
	'create_workflow_name', // Internal workflow naming
	'auto_compact_messages', // Internal state management
	'configurator_subgraph',
	'discovery_subgraph',
	'builder_subgraph',
];

/**
 * Extract message content from a node update
 */
function extractMessageContent(
	messages: Array<{ content: string | Array<{ type: string; text: string }> }>,
): string | null {
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
 * Process a single chunk from the LangGraph stream
 */
// eslint-disable-next-line complexity
export function processStreamChunk(streamMode: string, chunk: unknown): StreamOutput | null {
	if (streamMode === 'updates') {
		const nodeUpdate = chunk as Record<string, unknown>;

		// Handle special nodes first (backward compatibility)
		if (nodeUpdate.delete_messages) {
			const deleteUpdate = nodeUpdate.delete_messages as {
				messages?: Array<{ content: string | Array<{ type: string; text: string }> }>;
			};
			if ((deleteUpdate?.messages ?? []).length > 0) {
				const messageChunk: AgentMessageChunk = {
					role: 'assistant',
					type: 'message',
					text: 'Deleted, refresh?',
				};
				return { messages: [messageChunk] };
			}
		}

		if (nodeUpdate.compact_messages) {
			const compactUpdate = nodeUpdate.compact_messages as {
				messages?: Array<{ content: string | Array<{ type: string; text: string }> }>;
			};
			if ((compactUpdate?.messages ?? []).length > 0) {
				const content = extractMessageContent(compactUpdate.messages!);
				if (content) {
					const messageChunk: AgentMessageChunk = {
						role: 'assistant',
						type: 'message',
						text: content,
					};
					return { messages: [messageChunk] };
				}
			}
		}

		// Handle process_operations updates - emit workflow update after operations are processed
		if (nodeUpdate.process_operations) {
			const update = nodeUpdate.process_operations as {
				workflowJSON?: unknown;
				workflowOperations?: unknown;
			};
			if (update.workflowJSON && update.workflowOperations !== undefined) {
				// Create workflow update chunk
				const workflowUpdateChunk: WorkflowUpdateChunk = {
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: JSON.stringify(update.workflowJSON, null, 2),
				};
				return { messages: [workflowUpdateChunk] };
			}
		}

		// Generic handler for any agent node (including multi-agent nodes)
		for (const [nodeName, update] of Object.entries(nodeUpdate)) {
			// Skip nodes that shouldn't emit
			if (NODES_TO_SKIP.includes(nodeName)) {
				continue;
			}

			// Check if this node should emit messages
			if (AGENT_NODES_TO_EMIT.includes(nodeName)) {
				const agentUpdate = update as {
					messages?: Array<{ content: string | Array<{ type: string; text: string }> }>;
				};

				if ((agentUpdate?.messages ?? []).length > 0) {
					const content = extractMessageContent(agentUpdate.messages!);

					// Only emit non-empty content
					// Filter out empty strings, whitespace, and workflow context artifacts
					if (content && content.trim() && !content.includes('<current_workflow_json>')) {
						const messageChunk: AgentMessageChunk = {
							role: 'assistant',
							type: 'message',
							text: content,
						};
						return { messages: [messageChunk] };
					}
				}
			}
		}
	} else if (streamMode === 'custom') {
		// Handle custom tool updates
		const toolChunk = chunk as ToolProgressChunk;

		if (toolChunk?.type === 'tool') {
			const output: StreamOutput = { messages: [toolChunk] };
			// Don't emit workflow updates here - they'll be emitted after process_operations
			return output;
		}
	}

	return null;
}

/**
 * Create a stream processor that yields formatted chunks
 *
 * Handles both regular graph events and subgraph events (when subgraphs: true is enabled).
 * When subgraphs are enabled, events come as: [namespace, chunk] where namespace is array
 */
export async function* createStreamProcessor(
	stream: AsyncGenerator<any, void, unknown>,
): AsyncGenerator<StreamOutput> {
	for await (const event of stream) {
		// Subgraph events: flat 3-element array [namespace, streamMode, data]
		if (Array.isArray(event) && event.length === 3 && Array.isArray(event[0])) {
			const [_namespace, streamMode, data] = event;
			const output = processStreamChunk(streamMode, data);

			if (output) {
				yield output;
			}
		} else if (Array.isArray(event) && event.length === 2) {
			// Regular parent event: [streamMode, chunk]
			const [streamMode, chunk] = event;

			// Make sure it's a valid stream mode string
			if (typeof streamMode === 'string' && streamMode.length > 1) {
				const output = processStreamChunk(streamMode, chunk);

				if (output) {
					yield output;
				}
			}
		}
	}
}

/**
 * Format a HumanMessage into the expected output format
 */
function formatHumanMessage(msg: HumanMessage): Record<string, unknown> {
	return {
		role: 'user',
		type: 'message',
		text: msg.content,
	};
}

/**
 * Process array content from AIMessage and return formatted text messages
 */
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

/**
 * Process AIMessage content and return formatted messages
 */
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

/**
 * Create a formatted tool call message
 */
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

/**
 * Process tool calls from AIMessage and return formatted tool messages
 */
function processToolCalls(
	toolCalls: ToolCall[],
	builderTools?: BuilderToolBase[],
): Array<Record<string, unknown>> {
	return toolCalls.map((toolCall) => {
		const builderTool = builderTools?.find((bt) => bt.toolName === toolCall.name);
		return createToolCallMessage(toolCall, builderTool);
	});
}

/**
 * Process a ToolMessage and add its output to the corresponding tool call
 */
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
