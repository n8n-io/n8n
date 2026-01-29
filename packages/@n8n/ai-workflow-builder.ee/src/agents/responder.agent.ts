import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable, RunnableConfig } from '@langchain/core/runnables';
import type { StructuredTool } from '@langchain/core/tools';

import {
	buildResponderPrompt,
	buildRecursionErrorWithWorkflowGuidance,
	buildRecursionErrorNoWorkflowGuidance,
	buildGeneralErrorGuidance,
	buildDataTableCreationGuidance,
} from '@/prompts/agents/responder.prompt';

import { createIntrospectTool } from '../tools/introspect.tool';
import type { CoordinationLogEntry } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import { isAIMessage } from '../types/langchain';
import type { SimpleWorkflow } from '../types/workflow';
import {
	getErrorEntry,
	getBuilderOutput,
	getConfiguratorOutput,
	hasRecursionErrorsCleared,
} from '../utils/coordination-log';
import { extractDataTableInfo } from '../utils/data-table-helpers';

const systemPrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		[
			{
				type: 'text',
				text: buildResponderPrompt(),
				cache_control: { type: 'ephemeral' },
			},
		],
	],
	['placeholder', '{messages}'],
]);

export interface ResponderAgentConfig {
	llm: BaseChatModel;
}

/**
 * Context required for the responder to generate a response
 */
export interface ResponderContext {
	/** Conversation messages */
	messages: BaseMessage[];
	/** Coordination log tracking subgraph completion */
	coordinationLog: CoordinationLogEntry[];
	/** Discovery results (nodes found) */
	discoveryContext?: DiscoveryContext | null;
	/** Current workflow state */
	workflowJSON: SimpleWorkflow;
	/** Summary of previous conversation (from compaction) */
	previousSummary?: string;
}

/**
 * Responder Agent
 *
 * Synthesizes final user-facing responses from workflow building context.
 * Handles conversational queries and explanations.
 */
export class ResponderAgent {
	private readonly tool: StructuredTool;

	private readonly llmWithTools: Runnable;

	constructor(config: ResponderAgentConfig) {
		// Create and bind the diagnostic tool
		const introspectTool = createIntrospectTool();
		this.tool = introspectTool.tool;

		if (typeof config.llm.bindTools === 'function') {
			this.llmWithTools = config.llm.bindTools([this.tool]);
		} else {
			// Fallback for LLMs that don't support tools
			this.llmWithTools = config.llm;
		}
	}

	/**
	 * Build internal context message from coordination log and state
	 */
	private buildContextMessage(context: ResponderContext): HumanMessage | null {
		const contextParts: string[] = [];

		// Previous conversation summary (from compaction)
		if (context.previousSummary) {
			contextParts.push(`**Previous Conversation Summary:**\n${context.previousSummary}`);
		}

		// Check for state management actions (compact/clear)
		const stateManagementEntry = context.coordinationLog.find(
			(e) => e.phase === 'state_management',
		);
		if (stateManagementEntry) {
			contextParts.push(`**State Management:** ${stateManagementEntry.summary}`);
		}

		// Check for errors - provide context-aware guidance (AI-1812)
		// Skip errors that have been cleared (AI-1812)
		const errorEntry = getErrorEntry(context.coordinationLog);
		const errorsCleared = hasRecursionErrorsCleared(context.coordinationLog);

		if (errorEntry && !errorsCleared) {
			const hasWorkflow = context.workflowJSON.nodes.length > 0;
			const errorMessage = errorEntry.summary.toLowerCase();
			const isRecursionError =
				errorMessage.includes('recursion') ||
				errorMessage.includes('maximum number of steps') ||
				errorMessage.includes('iteration limit');

			contextParts.push(
				`**Error:** An error occurred in the ${errorEntry.phase} phase: ${errorEntry.summary}`,
			);

			// AI-1812: Provide better guidance based on workflow state and error type
			if (isRecursionError && hasWorkflow) {
				// Recursion error but workflow was created
				const guidance = buildRecursionErrorWithWorkflowGuidance(context.workflowJSON.nodes.length);
				contextParts.push(...guidance);
			} else if (isRecursionError && !hasWorkflow) {
				// Recursion error and no workflow created
				const guidance = buildRecursionErrorNoWorkflowGuidance();
				contextParts.push(...guidance);
			} else {
				// Other errors (not recursion-related)
				contextParts.push(buildGeneralErrorGuidance());
			}
		}

		// Discovery context
		if (context.discoveryContext?.nodesFound.length) {
			contextParts.push(
				`**Discovery:** Found ${context.discoveryContext.nodesFound.length} relevant nodes`,
			);
		}

		// Builder output
		const builderOutput = getBuilderOutput(context.coordinationLog);
		if (builderOutput) {
			contextParts.push(`**Builder:** ${builderOutput}`);
		} else if (context.workflowJSON.nodes.length) {
			contextParts.push(`**Workflow:** ${context.workflowJSON.nodes.length} nodes created`);
		}

		// Configurator output
		const configuratorOutput = getConfiguratorOutput(context.coordinationLog);
		if (configuratorOutput) {
			contextParts.push(`**Configuration:**\n${configuratorOutput}`);
		}

		// Data Table creation guidance
		// If the workflow contains Data Table nodes, inform user they need to create tables manually
		const dataTableInfo = extractDataTableInfo(context.workflowJSON);
		if (dataTableInfo.length > 0) {
			const dataTableGuidance = buildDataTableCreationGuidance(dataTableInfo);
			contextParts.push(dataTableGuidance);
		}

		if (contextParts.length === 0) {
			return null;
		}

		return new HumanMessage({
			content: `[Internal Context - Use this to craft your response]\n${contextParts.join('\n\n')}`,
		});
	}

	/**
	 * Invoke the responder agent with the given context
	 * @param context - Responder context with messages and workflow state
	 * @param config - Optional RunnableConfig for tracing callbacks
	 */
	async invoke(context: ResponderContext, config?: RunnableConfig): Promise<AIMessage> {
		const agent = systemPrompt.pipe(this.llmWithTools);

		const contextMessage = this.buildContextMessage(context);
		let messagesToSend: BaseMessage[] = contextMessage
			? [...context.messages, contextMessage]
			: [...context.messages];

		const MAX_ITERATIONS = 5;

		for (let i = 0; i < MAX_ITERATIONS; i++) {
			const result = await agent.invoke({ messages: messagesToSend }, config);

			if (!isAIMessage(result)) {
				return new AIMessage({
					content: 'I encountered an issue generating a response. Please try again.',
				});
			}

			// Check if there are tool calls
			if (!result.tool_calls || result.tool_calls.length === 0) {
				// No tool calls - this is the final response
				return result;
			}

			// Execute tool calls
			const toolMessages = await this.executeToolCalls(result, config);

			// Add AI message and tool messages for next iteration
			messagesToSend = [...messagesToSend, result, ...toolMessages];
		}

		// If we hit max iterations, make one final call without expecting tools
		const lastResult = await agent.invoke({ messages: messagesToSend }, config);
		if (isAIMessage(lastResult)) {
			return lastResult;
		}

		return new AIMessage({
			content: 'I encountered an issue generating a response. Please try again.',
		});
	}

	/**
	 * Execute tool calls from an AI message and return tool messages
	 */
	private async executeToolCalls(
		aiMessage: AIMessage,
		config?: RunnableConfig,
	): Promise<ToolMessage[]> {
		if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
			return [];
		}

		const toolMessages: ToolMessage[] = [];

		for (const toolCall of aiMessage.tool_calls) {
			if (toolCall.name === this.tool.name) {
				try {
					const result = await this.tool.invoke(toolCall.args ?? {}, {
						...config,
						toolCall: {
							id: toolCall.id,
							name: toolCall.name,
							args: toolCall.args ?? {},
						},
					});

					// Extract content from Command object response
					const content = this.extractToolContent(result);

					toolMessages.push(
						new ToolMessage({
							content,
							tool_call_id: toolCall.id ?? '',
							name: toolCall.name,
						}),
					);
				} catch (error) {
					toolMessages.push(
						new ToolMessage({
							content: `Tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
							tool_call_id: toolCall.id ?? '',
							name: toolCall.name,
						}),
					);
				}
			} else {
				// Unknown tool - return error message
				toolMessages.push(
					new ToolMessage({
						content: `Unknown tool: ${toolCall.name}`,
						tool_call_id: toolCall.id ?? '',
						name: toolCall.name,
					}),
				);
			}
		}

		return toolMessages;
	}

	/**
	 * Extract content from tool result, handling Command object pattern
	 */
	private extractToolContent(result: unknown): string {
		// Handle Command object pattern used by tools in this codebase
		if (result && typeof result === 'object' && 'update' in result) {
			const command = result as { update?: { messages?: BaseMessage[] } };
			const messages = command.update?.messages;
			if (messages && messages.length > 0) {
				const lastMessage = messages[messages.length - 1];
				if (typeof lastMessage.content === 'string') {
					return lastMessage.content;
				}
			}
		}

		// Fallback for direct string results
		if (typeof result === 'string') {
			return result;
		}

		return 'Tool executed successfully';
	}
}
