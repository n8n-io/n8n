import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';

import type { CoordinationLogEntry } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import type { SimpleWorkflow } from '../types/workflow';
import { getErrorEntry, getBuilderOutput, getConfiguratorOutput } from '../utils/coordination-log';

/**
 * Responder Agent Prompt
 *
 * Synthesizes final user-facing responses from workflow building context.
 * Also handles conversational queries.
 */
const RESPONDER_PROMPT = `You are a helpful AI assistant for n8n workflow automation.

You have access to context about what has been built, including:
- Discovery results (nodes found)
- Builder output (workflow structure)
- Configuration summary (setup instructions)

FOR WORKFLOW COMPLETION RESPONSES:
When you receive [Internal Context], synthesize a clean user-facing response:
1. Summarize what was built in a friendly way
2. Explain the workflow structure briefly
3. Include setup instructions if provided
4. Ask if user wants adjustments

Example response structure:
"I've created your [workflow type] workflow! Here's what it does:
[Brief explanation of the flow]

**Setup Required:**
[List any configuration steps from the context]

Let me know if you'd like to adjust anything."

FOR QUESTIONS/CONVERSATIONS:
- Be friendly and concise
- Explain n8n capabilities when asked
- Provide practical examples when helpful

RESPONSE STYLE:
- Keep responses focused and not overly long
- Use markdown formatting for readability
- Be conversational and helpful`;

const systemPrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		[
			{
				type: 'text',
				text: RESPONDER_PROMPT,
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

		// Check for errors - if there's an error, surface it prominently
		const errorEntry = getErrorEntry(context.coordinationLog);
		if (errorEntry) {
			contextParts.push(
				`**Error:** An error occurred in the ${errorEntry.phase} phase: ${errorEntry.summary}`,
			);
			contextParts.push(
				'Please apologize to the user and explain that something went wrong while building their workflow.',
			);
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
