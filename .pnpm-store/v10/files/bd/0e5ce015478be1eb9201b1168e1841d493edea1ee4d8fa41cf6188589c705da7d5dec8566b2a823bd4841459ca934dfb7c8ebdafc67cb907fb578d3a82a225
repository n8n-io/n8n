import { ReadableSpan, Span, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Context } from "@opentelemetry/api";
export declare function isTraceableSpan(span: ReadableSpan): boolean;
/**
 * Span processor that filters out spans that are not LangSmith-related and
 * usually should not be traced.
 */
export declare class LangSmithOTLPSpanProcessor extends BatchSpanProcessor {
    private traceMap;
    onStart(span: Span, parentContext: Context): void;
    onEnd(span: ReadableSpan): void;
    shutdown(): Promise<void>;
}
