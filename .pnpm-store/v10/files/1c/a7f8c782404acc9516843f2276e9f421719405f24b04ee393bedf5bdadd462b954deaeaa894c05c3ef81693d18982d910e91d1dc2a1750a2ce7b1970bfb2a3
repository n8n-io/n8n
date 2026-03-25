"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangSmithOTLPSpanProcessor = void 0;
exports.isTraceableSpan = isTraceableSpan;
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const constants_js_1 = require("./constants.cjs");
const utils_js_1 = require("./utils.cjs");
const run_trees_js_1 = require("../../run_trees.cjs");
function isTraceableSpan(span) {
    return (span.attributes[constants_js_1.LANGSMITH_TRACEABLE] === "true" ||
        typeof span.attributes["ai.operationId"] === "string");
}
function getParentSpanId(span) {
    // Backcompat shim to support OTEL 1.x and 2.x
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (span.parentSpanId ?? span.parentSpanContext?.spanId ?? undefined);
}
/**
 * Span processor that filters out spans that are not LangSmith-related and
 * usually should not be traced.
 */
class LangSmithOTLPSpanProcessor extends sdk_trace_base_1.BatchSpanProcessor {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "traceMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
    }
    onStart(span, parentContext) {
        if (!this.traceMap[span.spanContext().traceId]) {
            this.traceMap[span.spanContext().traceId] = {
                spanInfo: {},
                spanCount: 0,
            };
        }
        this.traceMap[span.spanContext().traceId].spanCount++;
        const isTraceable = isTraceableSpan(span);
        const parentSpanId = getParentSpanId(span);
        this.traceMap[span.spanContext().traceId].spanInfo[span.spanContext().spanId] = {
            isTraceable,
            parentSpanId,
        };
        let currentCandidateParentSpanId = parentSpanId;
        let traceableParentId;
        while (currentCandidateParentSpanId) {
            const currentSpanInfo = this.traceMap[span.spanContext().traceId].spanInfo[currentCandidateParentSpanId];
            if (currentSpanInfo?.isTraceable) {
                traceableParentId = currentCandidateParentSpanId;
                break;
            }
            currentCandidateParentSpanId = currentSpanInfo?.parentSpanId;
        }
        if (!traceableParentId) {
            span.attributes[constants_js_1.LANGSMITH_IS_ROOT] = true;
        }
        else {
            span.attributes[constants_js_1.LANGSMITH_PARENT_RUN_ID] =
                (0, utils_js_1.getUuidFromOtelSpanId)(traceableParentId);
            span.attributes[constants_js_1.LANGSMITH_TRACEABLE_PARENT_OTEL_SPAN_ID] =
                traceableParentId;
        }
        if (isTraceable) {
            super.onStart(span, parentContext);
        }
    }
    onEnd(span) {
        const traceInfo = this.traceMap[span.spanContext().traceId];
        if (!traceInfo)
            return;
        const spanInfo = traceInfo.spanInfo[span.spanContext().spanId];
        if (!spanInfo)
            return;
        // Decrement span count and cleanup trace if all spans are done
        traceInfo.spanCount--;
        if (traceInfo.spanCount <= 0) {
            delete this.traceMap[span.spanContext().traceId];
        }
        if (spanInfo.isTraceable) {
            super.onEnd(span);
        }
    }
    async shutdown() {
        await run_trees_js_1.RunTree.getSharedClient().awaitPendingTraceBatches();
        await super.shutdown();
    }
}
exports.LangSmithOTLPSpanProcessor = LangSmithOTLPSpanProcessor;
