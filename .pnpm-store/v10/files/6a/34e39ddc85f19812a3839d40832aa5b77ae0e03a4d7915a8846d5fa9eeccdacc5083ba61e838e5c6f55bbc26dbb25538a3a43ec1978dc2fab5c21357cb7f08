import { Tracer } from './tracer';
import { TracerProvider } from './tracer_provider';
import { TracerOptions } from './tracer_options';
/**
 * Tracer provider which provides {@link ProxyTracer}s.
 *
 * Before a delegate is set, tracers provided are NoOp.
 *   When a delegate is set, traces are provided from the delegate.
 *   When a delegate is set after tracers have already been provided,
 *   all tracers already provided will use the provided delegate implementation.
 */
export declare class ProxyTracerProvider implements TracerProvider {
    private _delegate?;
    /**
     * Get a {@link ProxyTracer}
     */
    getTracer(name: string, version?: string, options?: TracerOptions): Tracer;
    getDelegate(): TracerProvider;
    /**
     * Set the delegate tracer provider
     */
    setDelegate(delegate: TracerProvider): void;
    getDelegateTracer(name: string, version?: string, options?: TracerOptions): Tracer | undefined;
}
//# sourceMappingURL=ProxyTracerProvider.d.ts.map