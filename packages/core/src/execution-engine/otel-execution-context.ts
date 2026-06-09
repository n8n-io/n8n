/**
 * Lightweight bridge that lets packages/cli's OTEL instrumentation propagate an active
 * span context into the workflow execution loop inside packages/core, without adding a
 * direct dependency on @opentelemetry/api to packages/core.
 *
 * Usage (cli side — in WorkflowStartHandler after the span is created):
 *   import { registerOtelExecutionWrapper } from 'n8n-core';
 *   registerOtelExecutionWrapper(executionId, (fn) => otelContext.with(activeCtx, fn));
 *
 * Usage (core side — in WorkflowExecute after workflowExecuteBefore hook fires):
 *   const wrapper = consumeOtelExecutionWrapper(executionId);
 *   if (wrapper) await wrapper(runLoop);
 *   else await runLoop();
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
 * Retrieves and removes the registered wrapper for the given executionId.
 * Returns undefined if no wrapper was registered (e.g. OTEL is not enabled).
 */
export function consumeOtelExecutionWrapper(
	executionId: string,
): OtelContextWrapper | undefined {
	const wrapper = pendingWrappers.get(executionId);
	pendingWrappers.delete(executionId);
	return wrapper;
}
