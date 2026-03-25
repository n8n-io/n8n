import { Context } from '../context/types';
import { Span } from './span';
import { SpanOptions } from './SpanOptions';
import { Tracer } from './tracer';
/**
 * No-op implementations of {@link Tracer}.
 */
export declare class NoopTracer implements Tracer {
    startSpan(name: string, options?: SpanOptions, context?: Context): Span;
    startActiveSpan<F extends (span: Span) => ReturnType<F>>(name: string, fn: F): ReturnType<F>;
    startActiveSpan<F extends (span: Span) => ReturnType<F>>(name: string, opts: SpanOptions | undefined, fn: F): ReturnType<F>;
    startActiveSpan<F extends (span: Span) => ReturnType<F>>(name: string, opts: SpanOptions | undefined, ctx: Context | undefined, fn: F): ReturnType<F>;
}
//# sourceMappingURL=NoopTracer.d.ts.map