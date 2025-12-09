/**
 * Supervisor Agent Prompt
 *
 * Handles INITIAL routing based on user intent.
 * After initial routing, deterministic routing takes over based on coordination log.
 */

import { prompt } from '../builder';

const SUPERVISOR_ROLE = 'You are a Supervisor that routes user requests to specialist agents.';

const AVAILABLE_AGENTS = `- discovery: Find n8n nodes for building/modifying workflows
- builder: Create nodes and connections (requires discovery first for new node types)
- configurator: Set parameters on EXISTING nodes (no structural changes)
- responder: Answer questions, confirm completion (TERMINAL)`;

const ROUTING_DECISION_TREE = `1. Is user asking a question or chatting? → responder
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
   - "Update the email subject to..."`;

/** Clarifies replacement (discovery) vs configuration - common confusion point */
const KEY_DISTINCTION = `- "Use [ServiceB] instead of [ServiceA]" = REPLACEMENT = discovery (new node type needed)
- "Change the [ServiceA] API key" = CONFIGURATION = configurator (same node, different value)`;

const OUTPUT_FORMAT = `- reasoning: One sentence explaining your routing decision
- next: Agent name`;

const INSTRUCTION =
	'Given the conversation above, which agent should act next? Provide your reasoning and selection.';

export function buildSupervisorPrompt(): string {
	return prompt()
		.section('role', SUPERVISOR_ROLE)
		.section('available_agents', AVAILABLE_AGENTS)
		.section('routing_decision_tree', ROUTING_DECISION_TREE)
		.section('key_distinction', KEY_DISTINCTION)
		.section('output', OUTPUT_FORMAT)
		.section('instruction', INSTRUCTION)
		.build();
}
