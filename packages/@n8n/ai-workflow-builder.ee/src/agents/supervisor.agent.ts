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

ROUTING LOGIC:

New workflows:
- No discovery run → discovery
- Discovery complete + empty workflow → builder
- Nodes exist + unconfigured → configurator
- Fully configured → responder (to confirm completion, then END)

Modifications:
- Parameter changes only → configurator → responder (when done)
- Adding nodes → discovery (if < 5 calls) → builder → configurator → responder
- Structure changes → builder → configurator → responder
- Removing nodes → builder → responder

Questions/chit-chat:
- User asks questions → responder (conversation ends after response)
- User needs help → responder

CRITICAL RULES:
- Check <discovery_status> - NEVER route to discovery if count >= 5
- Always configure after building
- When workflow is complete, route to responder for final message
- Responder is TERMINAL - graph ends after responder responds

OUTPUT:
- reasoning: One sentence why (check workflow state)
- next: Agent name (responder is terminal)`;

const systemPrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		supervisorAgentPrompt +
			'\n\nGiven the conversation above, which agent should act next? Provide your reasoning and selection.',
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
