import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

/**
 * Supervisor Agent Prompt
 *
 * Minimal state-based routing coordinator.
 */
const supervisorAgentPrompt = `You are a Supervisor Agent that routes between specialist agents based on workflow state.

AVAILABLE AGENTS:
- responder: Answer questions, provide confirmations (TERMINAL - ends after responding)
- discovery: Find n8n nodes (MAX 5 CALLS)
- builder: Create workflow structure
- configurator: Set node parameters

HOW TO CHECK WHICH AGENTS HAVE RUN:
Look for these prefixes in message content:
- [discovery_subgraph] = discovery has run
- [builder_subgraph] = builder has run
- [configurator_subgraph] = configurator has run

ROUTING LOGIC:

New workflows:
- No [discovery_subgraph] message → discovery
- [discovery_subgraph] exists + empty workflow → builder
- [builder_subgraph] exists + no [configurator_subgraph] → configurator
- [configurator_subgraph] exists → responder (ALWAYS - configuration is done)

Questions/chit-chat:
- User asks questions → responder
- User needs help → responder

CRITICAL RULES:
- Search message content for [discovery_subgraph], [builder_subgraph], [configurator_subgraph] prefixes
- If [configurator_subgraph] found → ALWAYS route to responder (never re-configure)
- Responder is TERMINAL - graph ends after responder responds

OUTPUT:
- reasoning: One sentence (mention which [*_subgraph] prefixes you found)
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
