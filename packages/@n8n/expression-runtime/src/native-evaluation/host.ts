/** The data an expression reads. Each root is a property. */
export interface NativeEvaluationData {
	[root: string]: unknown;
	/** Returns the reference to the node with this name. */
	$: (nodeName: string) => unknown;
	$node: Record<string, unknown>;
	$workflow?: { id?: unknown };
}

/** What the caller supplies so that native results match its engine. */
export interface NativeEvaluationHost {
	/** Calls the expression extension `method` on `receiver`. */
	extend(receiver: unknown, method: string, args: unknown[]): unknown;
	/** Whether the engine surfaces this error. The engine swallows every other error. */
	isExpressionError(error: unknown): boolean;
}
