import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

/**
 * Supervisor Agent Prompt
 *
 * Handles INITIAL routing based on user intent.
 * After initial routing, deterministic routing takes over based on coordination log.
 */
const supervisorAgentPrompt = `You are a Supervisor that routes user requests to specialist agents.

INITIAL ROUTING (understand user intent):
- User wants to BUILD a new workflow → discovery (to find required nodes)
- User wants to ADD nodes to existing workflow → builder (skip discovery)
- User wants to CONFIGURE or MODIFY existing nodes → configurator
- User asks a QUESTION or wants to chat → responder

AVAILABLE AGENTS:
- discovery: Find n8n nodes for a workflow
- builder: Create workflow structure (nodes + connections)
- configurator: Set node parameters
- responder: Answer questions, confirm completion (TERMINAL)

ROUTING RULES:
- Default for new workflow requests → discovery
- If user explicitly mentions adding specific nodes → builder
- If user asks about existing workflow behavior → responder
- If user asks to change a parameter value → configurator

OUTPUT:
- reasoning: One sentence explaining your routing decision
- next: Agent name`;

const systemPrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		[
			{
				type: 'text',
				text:
					supervisorAgentPrompt +
					'\n\nGiven the conversation above, which agent should act next? Provide your reasoning and selection.',
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
	 * Get the supervisor agent with structured output for routing
	 */
	getAgent() {
		return systemPrompt.pipe<SupervisorRouting>(
			this.llm.withStructuredOutput(supervisorRoutingSchema, {
				name: 'routing_decision',
			}),
		);
	}
}
