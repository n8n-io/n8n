import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { RunnableConfig } from '@langchain/core/runnables';

import {
	buildResponderPrompt,
	buildRecursionErrorWithWorkflowGuidance,
	buildRecursionErrorNoWorkflowGuidance,
	buildGeneralErrorGuidance,
	buildDataTableCreationGuidance,
} from '@/prompts';

import type { CoordinationLogEntry } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import { isAIMessage } from '../types/langchain';
import type { SimpleWorkflow } from '../types/workflow';
import {
	getErrorEntry,
	getBuilderOutput,
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
	private llm: BaseChatModel;

	constructor(config: ResponderAgentConfig) {
		this.llm = config.llm;
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

		// Builder output (handles both node creation and parameter configuration)
		const builderOutput = getBuilderOutput(context.coordinationLog);
		if (builderOutput) {
			contextParts.push(`**Builder:** ${builderOutput}`);
		} else if (context.workflowJSON.nodes.length) {
			contextParts.push(`**Workflow:** ${context.workflowJSON.nodes.length} nodes created`);
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
		const agent = systemPrompt.pipe(this.llm);

		const contextMessage = this.buildContextMessage(context);
		const messagesToSend = contextMessage
			? [...context.messages, contextMessage]
			: context.messages;

		const result = await agent.invoke({ messages: messagesToSend }, config);
		if (!isAIMessage(result)) {
			return new AIMessage({
				content: 'I encountered an issue generating a response. Please try again.',
			});
		}
		return result;
	}
}
