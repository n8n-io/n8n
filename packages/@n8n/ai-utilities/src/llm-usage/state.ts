import { AsyncLocalStorage } from 'node:async_hooks';

import type { LlmCallContext, LlmCallGuard, LlmGuardedCall, LlmUsageSink } from './types';

// The sink, the guard and the scope store are module state, so every caller must load the same file.
// The `./llm-usage` export therefore points `import` and `require` at the CommonJS build.
export const callContextStorage = new AsyncLocalStorage<LlmCallContext>();

let sink: LlmUsageSink | undefined;

/** Turns capture on (a sink) or off (`undefined`). The host sets it once at startup. */
export function setLlmUsageSink(value: LlmUsageSink | undefined): void {
	sink = value;
}

export function getLlmUsageSink(): LlmUsageSink | undefined {
	return sink;
}

let guard: LlmCallGuard | undefined;

/** Sets the guard that capture sites call before each LLM call, or removes it (`undefined`). */
export function setLlmCallGuard(value: LlmCallGuard | undefined): void {
	guard = value;
}

/** Resolves when the call may be sent. Rejects with the guard's error when it is blocked. */
export async function checkLlmCall(call: LlmGuardedCall): Promise<void> {
	await guard?.(call);
}
