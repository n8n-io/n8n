/**
 * Memory thread metadata key that holds the id of the agent that an Agent
 * builder session builds. A recorded builder session belongs to the system
 * agent that runs it, but its memory and checkpoints stay keyed on the built
 * agent. Cleanup reads this key to find them.
 */
export const BUILT_AGENT_ID_METADATA_KEY = 'builtAgentId';

export function getBuiltAgentId(metadata: Record<string, unknown> | undefined): string | undefined {
	const value = metadata?.[BUILT_AGENT_ID_METADATA_KEY];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}
