// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { createTracingContext } from "./tracingContext";
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
/** @internal */
let instrumenterImplementation;
/**
 * Extends the Azure SDK with support for a given instrumenter implementation.
 *
 * @param instrumenter - The instrumenter implementation to use.
 */
export function useInstrumenter(instrumenter) {
    instrumenterImplementation = instrumenter;
}
/**
 * Gets the currently set instrumenter, a No-Op instrumenter by default.
 *
 * @returns The currently set instrumenter
 */
export function getInstrumenter() {
    if (!instrumenterImplementation) {
        instrumenterImplementation = createDefaultInstrumenter();
    }
    return instrumenterImplementation;
}
//# sourceMappingURL=instrumenter.js.map