import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';

import { buildSupervisorPrompt } from '@/prompts/agents/supervisor.prompt';

import type { CoordinationLogEntry } from '../types/coordination';
import type { SimpleWorkflow } from '../types/workflow';
import { buildWorkflowSummary } from '../utils/context-builders';
import { summarizeCoordinationLog } from '../utils/coordination-log';

const systemPrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		[
			{
				type: 'text',
				text: buildSupervisorPrompt(),
				cache_control: { type: 'ephemeral' },
			},
		],
	],
	['placeholder', '{messages}'],
]);

/**
 * Schema for supervisor routing decision
 */
export const supervisorRoutingSchema = z.object({
	reasoning: z.string().describe('One sentence explaining why this agent should act next'),
	next: z
		.enum(['responder', 'discovery', 'builder', 'configurator'])
		.describe('The next agent to call'),
});

export type SupervisorRouting = z.infer<typeof supervisorRoutingSchema>;

export interface SupervisorAgentConfig {
	llm: BaseChatModel;
}

/**
 * Context required for the supervisor to make routing decisions
 */
export interface SupervisorContext {
	/** Conversation messages */
	messages: BaseMessage[];
	/** Current workflow state */
	workflowJSON: SimpleWorkflow;
	/** Coordination log tracking subgraph completion */
	coordinationLog: CoordinationLogEntry[];
	/** Summary of previous conversation (from compaction) */
	previousSummary?: string;
}

/**
 * Supervisor Agent
 *
 * Coordinates the multi-agent workflow building process.
 * Routes to Discovery, Builder, or Configurator agents based on current state.
 */
export class SupervisorAgent {
	private llm: BaseChatModel;

	constructor(config: SupervisorAgentConfig) {
		this.llm = config.llm;
	}

	/**
	 * Build context message with workflow summary and completed phases
	 */
	private buildContextMessage(context: SupervisorContext): HumanMessage | null {
		const contextParts: string[] = [];

		// 1. Previous conversation summary (from compaction)
		if (context.previousSummary) {
			contextParts.push('<previous_conversation_summary>');
			contextParts.push(context.previousSummary);
			contextParts.push('</previous_conversation_summary>');
		}

		// 2. Workflow summary (node count and names only)
		if (context.workflowJSON.nodes.length > 0) {
			contextParts.push('<workflow_summary>');
			contextParts.push(buildWorkflowSummary(context.workflowJSON));
			contextParts.push('</workflow_summary>');
		}

		// 3. Coordination log summary (what phases completed)
		if (context.coordinationLog.length > 0) {
			contextParts.push('<completed_phases>');
			contextParts.push(summarizeCoordinationLog(context.coordinationLog));
			contextParts.push('</completed_phases>');
		}

		if (contextParts.length === 0) {
			return null;
		}

		return new HumanMessage({ content: contextParts.join('\n\n') });
	}

	/**
	 * Invoke the supervisor to get routing decision
	 * @param context - Supervisor context with messages and workflow state
	 * @param config - Optional RunnableConfig for tracing callbacks
	 */
	async invoke(context: SupervisorContext, config?: RunnableConfig): Promise<SupervisorRouting> {
		const agent = systemPrompt.pipe<SupervisorRouting>(
			this.llm.withStructuredOutput(supervisorRoutingSchema, {
				name: 'routing_decision',
			}),
		);

		const contextMessage = this.buildContextMessage(context);
		const messagesToSend = contextMessage
			? [...context.messages, contextMessage]
			: context.messages;

		return await agent.invoke({ messages: messagesToSend }, config);
	}
}
