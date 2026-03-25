// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createTracingContext } from "./tracingContext.js";
import { state } from "./state.js";
export function createDefaultTracingSpan() {
    return {
        end: () => {
            // noop
        },
        isRecording: () => false,
        recordException: () => {
            // noop
        },
        setAttribute: () => {
            // noop
        },
        setStatus: () => {
            // noop
        },
        addEvent: () => {
            // noop
        },
    };
}
export function createDefaultInstrumenter() {
    return {
        createRequestHeaders: () => {
            return {};
        },
        parseTraceparentHeader: () => {
            return undefined;
        },
        startSpan: (_name, spanOptions) => {
            return {
                span: createDefaultTracingSpan(),
                tracingContext: createTracingContext({ parentContext: spanOptions.tracingContext }),
            };
        },
        withContext(_context, callback, ...callbackArgs) {
            return callback(...callbackArgs);
        },
    };
}
/**
 * Extends the Azure SDK with support for a given instrumenter implementation.
 *
 * @param instrumenter - The instrumenter implementation to use.
 */
export function useInstrumenter(instrumenter) {
    state.instrumenterImplementation = instrumenter;
}
/**
 * Gets the currently set instrumenter, a No-Op instrumenter by default.
 *
 * @returns The currently set instrumenter
 */
export function getInstrumenter() {
    if (!state.instrumenterImplementation) {
        state.instrumenterImplementation = createDefaultInstrumenter();
    }
    return state.instrumenterImplementation;
}
//# sourceMappingURL=instrumenter.js.map