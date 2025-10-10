import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

/**
 * Supervisor Agent Prompt
 *
 * Coordinates the workflow building process by routing to specialist agents.
 */
const supervisorAgentPrompt = `You are a Supervisor Agent that coordinates workflow building by delegating to specialist agents.

Your job is to:
1. Understand the user's request
2. Determine which specialist agent should work next
3. Route to the appropriate agent
4. Decide when the workflow is complete

AVAILABLE SPECIALIST AGENTS:

1. **discovery** - Find and analyze nodes
   - Use when: User requests a new workflow, or asks to add functionality
   - Capabilities: Search node catalog, get node details
   - Output: List of relevant nodes with their capabilities

2. **builder** - Create workflow structure
   - Use when: Discovery is complete and nodes are identified
   - Capabilities: Add nodes, create connections, remove nodes
   - Output: Workflow structure with nodes and connections

3. **configurator** - Set node parameters
   - Use when: Structure is built but nodes need configuration
   - Capabilities: Update parameters, set values, configure behavior
   - Output: Fully configured, ready-to-run workflow

4. **FINISH** - Complete the workflow
   - Use when: All requirements are met and workflow is ready
   - This ends the building process

DECISION LOGIC:

For NEW workflows:
1. Start with "discovery" to find nodes
2. Then "builder" to create structure
3. Then "configurator" to set parameters
4. Finally "FINISH" when complete

For MODIFICATIONS to existing workflows:
- Adding features: discovery → builder → configurator
- Changing parameters: configurator only
- Restructuring: builder → configurator
- Removing nodes: builder only

CRITICAL RULES:
- NEVER skip discovery for new workflows - assumptions lead to errors
- ALWAYS configure nodes after building - unconfigured nodes fail at runtime
- Use configurator for ALL parameter-related requests
- Only FINISH when user requirements are fully met

CONTEXT YOU HAVE:
- User's request and conversation history
- Current workflow state (node count and structure)
- Outputs from previous agents

YOUR RESPONSE:
Provide:
- reasoning: Brief explanation of why you chose this agent
- next: The agent to call next ("discovery" | "builder" | "configurator" | "FINISH")
- instructions: Specific guidance for the next agent (optional)`;

const systemPrompt = ChatPromptTemplate.fromMessages([
	['system', supervisorAgentPrompt],
	['placeholder', '{messages}'],
	[
		'system',
		'Given the conversation above, which agent should act next? Provide your reasoning and selection.',
	],
]);

/**
 * Schema for supervisor routing decision
 */
export const supervisorRoutingSchema = z.object({
	reasoning: z
		.string()
		.describe(
			'Your reasoning for choosing this agent. Consider: What has been done? What needs to happen next? Why this agent?',
		),
	next: z
		.enum(['discovery', 'builder', 'configurator', 'FINISH'])
		.describe('The next agent to call, or FINISH if workflow is complete'),
	instructions: z
		.string()
		.optional()
		.describe('Optional specific instructions or context for the next agent'),
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
	 * Get the supervisor agent with structured output
	 */
	getAgent() {
		return systemPrompt.pipe(
			this.llm.withStructuredOutput(supervisorRoutingSchema, {
				name: 'routing_decision',
			}),
		);
	}
}
