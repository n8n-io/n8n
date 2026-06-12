export type McpToolIncludeMode = 'all' | 'selected' | 'except' | 'hints';

export type McpToolHint =
	| 'readOnlyHint'
	| 'destructiveHint'
	| 'idempotentHint'
	| 'openWorldHint';
