import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { CompiledStateGraph } from '@langchain/langgraph';

import type { WorkflowState } from '../workflow-state';

/**
 * Chunk types emitted by the stream processor
 */
export interface AgentMessageChunk {
	role: 'assistant';
	type: 'message';
	text: string;
}

export interface ToolProgressChunk {
	type: 'tool';
	toolName: string;
	status: string;
	[key: string]: unknown;
}

export interface WorkflowUpdateChunk {
	role: 'assistant';
	type: 'workflow-updated';
	codeSnippet: string;
}

export interface ExecutionRequestChunk {
	role: 'assistant';
	type: 'execution-requested';
	reason: string;
}

export type StreamChunk =
	| AgentMessageChunk
	| ToolProgressChunk
	| WorkflowUpdateChunk
	| ExecutionRequestChunk;

export interface StreamOutput {
	messages: StreamChunk[];
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
 * Configuration for stream processing
 */
export interface StreamProcessorConfig {
	/** Thread configuration for retrieving state */
	threadConfig: { configurable: { thread_id: string } };
	/** List of tool names that trigger workflow updates */
	workflowUpdateTools?: Array<(typeof DEFAULT_WORKFLOW_UPDATE_TOOLS)[number]>;
}

/**
 * Process a single chunk from the LangGraph stream
 */
// eslint-disable-next-line complexity
export async function processStreamChunk(
	streamMode: string,
	chunk: unknown,
	agent: CompiledStateGraph<
		typeof WorkflowState.State,
		Partial<typeof WorkflowState.State>,
		'__start__' | 'agent' | 'tools' | 'delete_messages' | 'compact_messages'
	>,
	config: StreamProcessorConfig,
): Promise<StreamOutput | null> {
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
	} else if (streamMode === 'custom') {
		// Handle custom tool updates
		const toolChunk = chunk as ToolProgressChunk;

		if (toolChunk?.type === 'tool') {
			const output: StreamOutput = { messages: [toolChunk] };

			// Check if this tool update should trigger a workflow update
			const shouldUpdateWorkflow =
				(config.workflowUpdateTools ?? DEFAULT_WORKFLOW_UPDATE_TOOLS)?.includes(
					toolChunk.toolName,
				) && toolChunk.status === 'completed';

			if (shouldUpdateWorkflow) {
				// Get current workflow state
				const currentState = await agent.getState(config.threadConfig);
				const workflowJSON = (currentState.values as typeof WorkflowState.State).workflowJSON;

				// Add workflow update chunk
				const workflowUpdateChunk: WorkflowUpdateChunk = {
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: JSON.stringify(workflowJSON, null, 2),
				};

				output.messages.push(workflowUpdateChunk);
			}

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
	agent: CompiledStateGraph<
		typeof WorkflowState.State,
		Partial<typeof WorkflowState.State>,
		'__start__' | 'agent' | 'tools' | 'delete_messages' | 'compact_messages'
	>,
	config: StreamProcessorConfig,
): AsyncGenerator<StreamOutput> {
	for await (const [streamMode, chunk] of stream) {
		const output = await processStreamChunk(streamMode, chunk, agent, config);

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

			// Add the AI message content if it exists
			if (msg.content) {
				formattedMessages.push({
					role: 'assistant',
					type: 'message',
					text: msg.content,
				});
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
