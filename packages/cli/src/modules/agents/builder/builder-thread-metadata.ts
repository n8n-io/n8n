/**
 * Memory thread metadata key that holds the id of the agent that a recorded
 * Agent builder session builds. The session, its checkpoints and its memory
 * belong to the system agent that runs it, so this key is the only link to
 * the built agent. It is information only: no cleanup reads it.
 */
export const BUILT_AGENT_ID_METADATA_KEY = 'builtAgentId';
