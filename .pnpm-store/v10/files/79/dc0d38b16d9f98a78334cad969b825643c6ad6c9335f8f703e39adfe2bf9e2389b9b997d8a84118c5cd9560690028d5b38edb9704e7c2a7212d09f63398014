import type { TracingContext, TracingSpan } from "./interfaces.js";
/** @internal */
export declare const knownContextKeys: {
    span: symbol;
    namespace: symbol;
};
/**
 * Creates a new {@link TracingContext} with the given options.
 * @param options - A set of known keys that may be set on the context.
 * @returns A new {@link TracingContext} with the given options.
 *
 * @internal
 */
export declare function createTracingContext(options?: CreateTracingContextOptions): TracingContext;
/** @internal */
export declare class TracingContextImpl implements TracingContext {
    private _contextMap;
    constructor(initialContext?: TracingContext);
    setValue(key: symbol, value: unknown): TracingContext;
    getValue(key: symbol): unknown;
    deleteValue(key: symbol): TracingContext;
}
/**
 * Represents a set of items that can be set when creating a new {@link TracingContext}.
 */
export interface CreateTracingContextOptions {
    /** The {@link parentContext} - the newly created context will contain all the values of the parent context unless overridden. */
    parentContext?: TracingContext;
    /** An initial span to set on the context. */
    span?: TracingSpan;
    /** The namespace to set on any child spans. */
    namespace?: string;
}
//# sourceMappingURL=tracingContext.d.ts.map