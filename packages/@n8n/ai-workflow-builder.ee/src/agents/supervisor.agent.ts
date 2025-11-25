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

AVAILABLE AGENTS:
- discovery: Find n8n nodes for building/modifying workflows
- builder: Create nodes and connections (requires discovery first for new node types)
- configurator: Set parameters on EXISTING nodes (no structural changes)
- responder: Answer questions, confirm completion (TERMINAL)

ROUTING DECISION TREE:

1. Is user asking a question or chatting? → responder
   Examples: "what does this do?", "explain the workflow", "thanks"

2. Does the request involve NEW or DIFFERENT node types? → discovery
   Examples:
   - "Build a workflow that..." (new workflow)
   - "Use [ServiceB] instead of [ServiceA]" (replacing node type)
   - "Add [some integration]" (new integration)
   - "Switch from [ServiceA] to [ServiceB]" (swapping services)

3. Is the request about connecting/disconnecting existing nodes? → builder
   Examples: "Connect node A to node B", "Remove the connection to X"

4. Is the request about changing VALUES in existing nodes? → configurator
   Examples:
   - "Change the URL to https://..."
   - "Set the timeout to 30 seconds"
   - "Update the email subject to..."

KEY DISTINCTION:
- "Use [ServiceB] instead of [ServiceA]" = REPLACEMENT = discovery (new node type needed)
- "Change the [ServiceA] API key" = CONFIGURATION = configurator (same node, different value)

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
