/**
 * Agent-level capabilities and limitations the Instance AI orchestrator surfaces
 * to plan agent builds. Lives in the agents module — the source of truth — so
 * it stays aligned with the agent config schema and business rules as they
 * evolve. The orchestrator reads these through the builder delegate
 * (`listAgentCapabilities`), never hardcoding them, so a capability added or
 * removed here flows to the orchestrator without a cross-package change.
 */

/** What an n8n Agent can do beyond chat channels — brief, for planning. */
export const AGENT_CAPABILITIES = [
	'Call tools — n8n nodes, attached workflows, or custom code tools — to take actions and query services.',
	'Connect to MCP servers to expose external tool catalogs.',
	'Use skills — reusable instruction bundles — to extend its behavior.',
	'Run scheduled tasks (e.g. a daily summary) without a chat trigger.',
	'Delegate to published sub-agents for specialized work.',
	'Use memory and vector stores to recall context and search documents.',
	'Be triggered from a supported chat channel (see `channels`) or Preview.',
] as const;

/** Agent-level limitations the orchestrator must respect when planning a build. */
export const AGENT_LIMITATIONS = [
	'Agents cannot create n8n workflows or data tables; attach existing workflows only.',
	'Chat channels must come from the channels field of this result — any other channel is unsupported.',
] as const;
