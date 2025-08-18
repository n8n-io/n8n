import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';

import type {
	AgentMessageChunk,
	ToolProgressChunk,
	WorkflowUpdateChunk,
	StreamOutput,
} from '../types/streaming';

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

				const messageChunk: AgentMessageChunk = {
					role: 'assistant',
					type: 'message',
					text: content,
				};

				return { messages: [messageChunk] };
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

export function formatMessages(
	messages: Array<AIMessage | HumanMessage | ToolMessage>,
): Array<Record<string, unknown>> {
	const formattedMessages: Array<Record<string, unknown>> = [];

	for (const msg of messages) {
		if (msg instanceof HumanMessage) {
			formattedMessages.push({
				role: 'user',
				type: 'message',
				text: msg.content,
			});
		} else if (msg instanceof AIMessage) {
			// Add the AI message content if it exists
			if (msg.content) {
				if (Array.isArray(msg.content)) {
					// Handle array content (multi-part messages)
					const textMessages = msg.content.filter((c) => c.type === 'text');

					textMessages.forEach((textMessage) => {
						if (textMessage.type !== 'text') {
							return;
						}
						formattedMessages.push({
							role: 'assistant',
							type: 'message',
							text: textMessage.text,
						});
					});
				} else {
					formattedMessages.push({
						role: 'assistant',
						type: 'message',
						text: msg.content,
					});
				}
			}
			// Handle tool calls in AI messages
			if (msg.tool_calls && msg.tool_calls.length > 0) {
				// Add tool messages for each tool call
				for (const toolCall of msg.tool_calls) {
					formattedMessages.push({
						id: toolCall.id,
						toolCallId: toolCall.id,
						role: 'assistant',
						type: 'tool',
						toolName: toolCall.name,
						status: 'completed',
						updates: [
							{
								type: 'input',
								data: toolCall.args || {},
							},
						],
					});
				}
			}
		} else if (msg instanceof ToolMessage) {
			// Find the tool message by ID and add the output
			const toolCallId = msg.tool_call_id;
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
	}

	return formattedMessages;
}
