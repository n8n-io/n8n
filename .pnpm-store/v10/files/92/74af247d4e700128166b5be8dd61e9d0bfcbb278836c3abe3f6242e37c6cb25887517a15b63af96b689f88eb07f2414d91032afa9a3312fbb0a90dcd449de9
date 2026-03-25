import { BatchSpanProcessor, } from "@opentelemetry/sdk-trace-base";
import { LANGSMITH_IS_ROOT, LANGSMITH_PARENT_RUN_ID, LANGSMITH_TRACEABLE, LANGSMITH_TRACEABLE_PARENT_OTEL_SPAN_ID, } from "./constants.js";
import { getUuidFromOtelSpanId } from "./utils.js";
import { RunTree } from "../../run_trees.js";
export function isTraceableSpan(span) {
    return (span.attributes[LANGSMITH_TRACEABLE] === "true" ||
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
export class LangSmithOTLPSpanProcessor extends BatchSpanProcessor {
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
            span.attributes[LANGSMITH_IS_ROOT] = true;
        }
        else {
            span.attributes[LANGSMITH_PARENT_RUN_ID] =
                getUuidFromOtelSpanId(traceableParentId);
            span.attributes[LANGSMITH_TRACEABLE_PARENT_OTEL_SPAN_ID] =
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
        await RunTree.getSharedClient().awaitPendingTraceBatches();
        await super.shutdown();
    }
}
