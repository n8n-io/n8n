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
 * Process a single chunk from the LangGraph stream
 */
// eslint-disable-next-line complexity
export function processStreamChunk(streamMode: string, chunk: unknown): StreamOutput | null {
	if (streamMode === 'updates') {
		// Handle agent message updates
		const agentChunk = chunk as {
			agent?: { messages?: Array<{ content: string | Array<{ type: string; text: string }> }> };
			compact_messages?: {
				messages?: Array<{ content: string | Array<{ type: string; text: string }> }>;
			};
			delete_messages?: {
				messages?: Array<{ content: string | Array<{ type: string; text: string }> }>;
			};
			process_operations?: {
				workflowJSON?: unknown;
				workflowOperations?: unknown;
			};
		};

		if ((agentChunk?.delete_messages?.messages ?? []).length > 0) {
			const messageChunk: AgentMessageChunk = {
				role: 'assistant',
				type: 'message',
				text: 'Deleted, refresh?',
			};

			return { messages: [messageChunk] };
		}

		if ((agentChunk?.compact_messages?.messages ?? []).length > 0) {
			const lastMessage =
				agentChunk.compact_messages!.messages![agentChunk.compact_messages!.messages!.length - 1];

			const messageChunk: AgentMessageChunk = {
				role: 'assistant',
				type: 'message',
				text: lastMessage.content as string,
			};

			return { messages: [messageChunk] };
		}

		if ((agentChunk?.agent?.messages ?? []).length > 0) {
			const lastMessage = agentChunk.agent!.messages![agentChunk.agent!.messages!.length - 1];
			if (lastMessage.content) {
				let content: string;

				// Handle array content (multi-part messages)
				if (Array.isArray(lastMessage.content)) {
					content = lastMessage.content
						.filter((c) => c.type === 'text')
						.map((b) => b.text)
						.join('\n');
				} else {
					content = lastMessage.content;
				}

				if (content) {
					const messageChunk: AgentMessageChunk = {
						role: 'assistant',
						type: 'message',
						text: content,
					};

					return { messages: [messageChunk] };
				}

				return null;
			}
		}

		// Handle process_operations updates - emit workflow update after operations are processed
		if (agentChunk?.process_operations) {
			// Check if operations were processed (indicated by cleared operations array)
			const update = agentChunk.process_operations;
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
 */
export async function* createStreamProcessor(
	stream: AsyncGenerator<[string, unknown], void, unknown>,
): AsyncGenerator<StreamOutput> {
	for await (const [streamMode, chunk] of stream) {
		const output = processStreamChunk(streamMode, chunk);

		if (output) {
			yield output;
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
