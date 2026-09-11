import type { ASK_USER_TOOL_ID } from '@n8n/instance-ai';

// Stored-content markers shared by the SQL prefilter and the JSON parsing.

export const TOOL_CALL_PART_TYPE = 'tool-call';
export const INVALID_TOOL_CALL_PART_TYPE = 'invalid-tool-call';

/** Content-part types that mark tool activity on an assistant row. */
export const TOOL_CALL_PART_TYPES: readonly string[] = [
	TOOL_CALL_PART_TYPE,
	INVALID_TOOL_CALL_PART_TYPE,
];

// Type-tied to the package's id, so a rename fails `pnpm typecheck` while this
// module stays free of runtime imports from the package.
export const ASK_USER_TOOL_NAME: typeof ASK_USER_TOOL_ID = 'ask-user';
