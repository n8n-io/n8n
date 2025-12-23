import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';

import { buildResponderPrompt } from '@/prompts/agents/responder.prompt';

import type { CoordinationLogEntry } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import type { SimpleWorkflow } from '../types/workflow';
import { getErrorEntry, getBuilderOutput, getConfiguratorOutput } from '../utils/coordination-log';

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
		const errorsCleared = context.coordinationLog.some(
			(entry) =>
				entry.phase === 'state_management' &&
				entry.summary.includes('Cleared') &&
				entry.summary.includes('recursion'),
		);

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
				contextParts.push(
					`**Workflow Status:** ${context.workflowJSON.nodes.length} nodes were created before the complexity limit was reached.`,
				);
				contextParts.push(
					"Tell the user that you've created their workflow but reached a complexity limit while fine-tuning. " +
						'The workflow should work and they can test it. ' +
						'If they need adjustments or want to continue building, they can ask you to make specific changes.',
				);
			} else if (isRecursionError && !hasWorkflow) {
				// Recursion error and no workflow created
				contextParts.push(
					'**Workflow Status:** No nodes were created - the request was too complex to process automatically.',
				);
				contextParts.push(
					'Explain that the workflow design became too complex for automatic generation. ' +
						'Suggest options: (1) Break the request into smaller steps, (2) Simplify the workflow, ' +
						'or (3) Start with a basic version and iteratively add complexity.',
				);
			} else {
				// Other errors (not recursion-related)
				contextParts.push(
					'Apologize and explain that a technical error occurred. ' +
						'Ask if they would like to try again or approach the problem differently.',
				);
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

		if (contextParts.length === 0) {
			return null;
		}

		return new HumanMessage({
			content: `[Internal Context - Use this to craft your response]\n${contextParts.join('\n\n')}`,
		});
	}

	/**
	 * Invoke the responder agent with the given context
	 */
	async invoke(context: ResponderContext): Promise<AIMessage> {
		const agent = systemPrompt.pipe(this.llm);

		const contextMessage = this.buildContextMessage(context);
		const messagesToSend = contextMessage
			? [...context.messages, contextMessage]
			: context.messages;

		return (await agent.invoke({ messages: messagesToSend })) as AIMessage;
	}
}
