import { AsyncLocalStorage } from 'node:async_hooks';

import type { LlmCallContext, LlmUsageSink } from './types';

// The sink and the scope store are module state, so every caller must load the same file.
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
