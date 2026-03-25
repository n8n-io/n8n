import { Context } from '../context/types';
import { Span } from './span';
import { SpanOptions } from './SpanOptions';
import { Tracer } from './tracer';
import { TracerOptions } from './tracer_options';
/**
 * Proxy tracer provided by the proxy tracer provider
 */
export declare class ProxyTracer implements Tracer {
    private _provider;
    readonly name: string;
    readonly version?: string | undefined;
    readonly options?: TracerOptions | undefined;
    private _delegate?;
    constructor(_provider: TracerDelegator, name: string, version?: string | undefined, options?: TracerOptions | undefined);
    startSpan(name: string, options?: SpanOptions, context?: Context): Span;
    startActiveSpan<F extends (span: Span) => unknown>(_name: string, _options: F | SpanOptions, _context?: F | Context, _fn?: F): ReturnType<F>;
    /**
     * Try to get a tracer from the proxy tracer provider.
     * If the proxy tracer provider has no delegate, return a noop tracer.
     */
    private _getTracer;
}
export interface TracerDelegator {
    getDelegateTracer(name: string, version?: string, options?: TracerOptions): Tracer | undefined;
}
//# sourceMappingURL=ProxyTracer.d.ts.map