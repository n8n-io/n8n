import { callContextStorage, getLlmUsageSink } from './state';
import type { LlmCallContext } from './types';

/** The context of the current scope, or `undefined` outside a scope. */
export function getLlmCallContext(): LlmCallContext | undefined {
	return callContextStorage.getStore();
}

/** Runs `fn` in a scope: every LLM call reported inside it gets `context`. */
export function runWithLlmCallContext<T>(context: LlmCallContext, fn: () => T): T {
	if (!getLlmUsageSink()) return fn();
	return callContextStorage.run(context, fn);
}

/** Adds fields to the current scope, for example a project that is loaded after the run starts. */
export function enrichLlmCallContext(fields: Partial<LlmCallContext>): void {
	const context = callContextStorage.getStore();
	if (context) Object.assign(context, fields);
}
