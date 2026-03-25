"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultTracingSpan = createDefaultTracingSpan;
exports.createDefaultInstrumenter = createDefaultInstrumenter;
exports.useInstrumenter = useInstrumenter;
exports.getInstrumenter = getInstrumenter;
const tracingContext_js_1 = require("./tracingContext.js");
const state_js_1 = require("./state.js");
function createDefaultTracingSpan() {
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
function createDefaultInstrumenter() {
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
                tracingContext: (0, tracingContext_js_1.createTracingContext)({ parentContext: spanOptions.tracingContext }),
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
function useInstrumenter(instrumenter) {
    state_js_1.state.instrumenterImplementation = instrumenter;
}
/**
 * Gets the currently set instrumenter, a No-Op instrumenter by default.
 *
 * @returns The currently set instrumenter
 */
function getInstrumenter() {
    if (!state_js_1.state.instrumenterImplementation) {
        state_js_1.state.instrumenterImplementation = createDefaultInstrumenter();
    }
    return state_js_1.state.instrumenterImplementation;
}
//# sourceMappingURL=instrumenter.js.map