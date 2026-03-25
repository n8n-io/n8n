import { Context, Span } from '@opentelemetry/api';
import { SpanProcessor as BaseSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
/**
 * Span processor that propagates baggage key/value pairs to span attributes.
 *
 * This processor copies baggage entries onto spans based on the operation type.
 * For invoke_agent operations, it applies both generic and invoke-agent-specific attributes.
 * For other operations, it applies only generic attributes.
 */
export declare class SpanProcessor implements BaseSpanProcessor {
    /**
     * Called when a span is started.
     * Copies relevant baggage entries to span attributes.
     */
    onStart(span: Span, parentContext?: Context): void;
    /**
     * Called when a span is ended.
     */
    onEnd(_span: ReadableSpan): void;
    /**
     * Shutdown the processor.
     */
    shutdown(): Promise<void>;
    /**
     * Force flush the processor.
     */
    forceFlush(): Promise<void>;
}
//# sourceMappingURL=SpanProcessor.d.ts.map