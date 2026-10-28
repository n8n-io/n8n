import { getLegacyBuilderToolNames, WORKFLOW_BUILDER_TOOL_NAMES } from '@n8n/api-types';

// Stored-content markers shared by the SQL prefilter and the JSON parsing.

export const TOOL_CALL_PART_TYPE = 'tool-call';
export const INVALID_TOOL_CALL_PART_TYPE = 'invalid-tool-call';

/** Content-part types that mark tool activity on an assistant row. */
export const TOOL_CALL_PART_TYPES: readonly string[] = [
	TOOL_CALL_PART_TYPE,
	INVALID_TOOL_CALL_PART_TYPE,
];

export const ASK_USER_TOOL_NAME = WORKFLOW_BUILDER_TOOL_NAMES.ASK_USER;

// Rows stored before the rename carry the former tool name.
export const LEGACY_ASK_USER_TOOL_NAMES: readonly string[] =
	getLegacyBuilderToolNames(ASK_USER_TOOL_NAME);

export const ASK_USER_TOOL_NAMES: readonly string[] = [
	ASK_USER_TOOL_NAME,
	...LEGACY_ASK_USER_TOOL_NAMES,
];
