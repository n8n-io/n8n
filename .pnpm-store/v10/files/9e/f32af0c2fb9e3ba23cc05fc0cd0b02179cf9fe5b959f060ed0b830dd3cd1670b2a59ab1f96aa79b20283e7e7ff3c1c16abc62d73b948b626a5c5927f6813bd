import { Context } from '@opentelemetry/api';
import { ReadableSpan } from './export/ReadableSpan';
import { Span } from './Span';
import { SpanProcessor } from './SpanProcessor';
/**
 * Implementation of the {@link SpanProcessor} that simply forwards all
 * received events to a list of {@link SpanProcessor}s.
 */
export declare class MultiSpanProcessor implements SpanProcessor {
    private readonly _spanProcessors;
    constructor(_spanProcessors: SpanProcessor[]);
    forceFlush(): Promise<void>;
    onStart(span: Span, context: Context): void;
    onEnd(span: ReadableSpan): void;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=MultiSpanProcessor.d.ts.map