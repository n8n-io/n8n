const brand = Symbol('ToolCallClearance');

/**
 * Proof that the tool call runner decided to run a tool call. `executeTool` requires one, so
 * a new code path cannot reach a tool handler without the `preToolExecution` hook.
 */
export interface ToolCallClearance {
	readonly [brand]: true;
}

/** Only `ToolCallRunner` calls this, after the `preToolExecution` hook allowed the call. */
export function clearToolCall(): ToolCallClearance {
	return { [brand]: true };
}

export function isToolCallClearance(value: unknown): value is ToolCallClearance {
	return typeof value === 'object' && value !== null && brand in value;
}
