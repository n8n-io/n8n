/**
 * Lightweight bridge that lets `packages/cli`'s OTEL instrumentation propagate an active
 * span context into the workflow execution running in `packages/core`, without adding a
 * direct dependency on `@opentelemetry/api` to `packages/core`.
 *
 * - cli side (when the workflow span is created): registers a wrapper keyed by execution id
 *   that runs a callback inside `context.with(activeCtx, callback)`.
 * - core side (in `WorkflowExecute`): consumes the wrapper and runs the execution inside it,
 *   so `trace.getActiveSpan()` resolves during log writes and node executions.
 */

export type OtelContextWrapper = (fn: () => Promise<void>) => Promise<void>;

const pendingWrappers = new Map<string, OtelContextWrapper>();

export function registerOtelExecutionWrapper(
	executionId: string,
	wrapper: OtelContextWrapper,
): void {
	pendingWrappers.set(executionId, wrapper);
}

/**
 * Retrieves and removes the wrapper registered for the given execution id.
 * Returns `undefined` if none was registered (e.g. OTEL disabled), so callers
 * can safely fall back to running the execution without a context wrapper.
 */
export function consumeOtelExecutionWrapper(executionId: string): OtelContextWrapper | undefined {
	const wrapper = pendingWrappers.get(executionId);
	pendingWrappers.delete(executionId);
	return wrapper;
}
