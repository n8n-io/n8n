"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContextWithParentSpanRef = createContextWithParentSpanRef;
exports.runWithParentSpanRef = runWithParentSpanRef;
const api_1 = require("@opentelemetry/api");
const logging_1 = __importDefault(require("../../utils/logging"));
function isValidTraceId(traceId) {
    return /^[0-9a-f]{32}$/i.test(traceId) && traceId !== '00000000000000000000000000000000';
}
function isValidSpanId(spanId) {
    return /^[0-9a-f]{16}$/i.test(spanId) && spanId !== '0000000000000000';
}
/**
 * Creates a new Context with an explicit parent span reference.
 * This allows child spans to be correctly parented even when async context is broken.
 *
 * @param base The base context to extend (typically context.active())
 * @param parent The parent span reference containing traceId and spanId
 * @returns A new Context with the parent span set
 */
function createContextWithParentSpanRef(base, parent) {
    logging_1.default.info(`[ParentSpanContext] Creating context with parent span: traceId=${parent.traceId}, spanId=${parent.spanId}`);
    if (!isValidTraceId(parent.traceId) || !isValidSpanId(parent.spanId)) {
        logging_1.default.warn(`[ParentSpanContext] Invalid parent span reference; returning base context. traceId=${parent.traceId}, spanId=${parent.spanId}`);
        return base;
    }
    // Determine traceFlags:
    // 1. Use parent.traceFlags if explicitly provided
    // 2. Inherit from active span if its traceId matches
    // 3. Default to SAMPLED — manually instrumented spans should always be captured
    const activeCtx = api_1.trace.getSpan(base)?.spanContext();
    const traceFlags = parent.traceFlags
        ?? (activeCtx?.traceId === parent.traceId ? activeCtx.traceFlags : undefined)
        ?? api_1.TraceFlags.SAMPLED;
    // Create a SpanContext from the parent reference
    const parentSpanContext = {
        traceId: parent.traceId,
        spanId: parent.spanId,
        traceFlags,
        traceState: parent.traceState,
        isRemote: parent.isRemote ?? true,
    };
    // Create a non-recording span with the parent context
    const parentSpan = api_1.trace.wrapSpanContext(parentSpanContext);
    // Set this span in the base context
    const contextWithParent = api_1.trace.setSpan(base, parentSpan);
    return contextWithParent;
}
/**
 * Runs a callback function within a context that has an explicit parent span reference.
 * This is useful for creating child spans in async callbacks where context propagation is broken.
 *
 * @param parent The parent span reference
 * @param callback The function to execute with the parent context
 * @returns The result of the callback
 */
function runWithParentSpanRef(parent, callback) {
    const base = api_1.context.active();
    const contextWithParent = createContextWithParentSpanRef(base, parent);
    logging_1.default.info('[ParentSpanContext] Running callback with parent span context.');
    return api_1.context.with(contextWithParent, callback);
}
//# sourceMappingURL=parent-span-context.js.map