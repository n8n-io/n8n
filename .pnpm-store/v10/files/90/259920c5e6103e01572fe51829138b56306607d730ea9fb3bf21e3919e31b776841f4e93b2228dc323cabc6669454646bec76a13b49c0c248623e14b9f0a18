/**
 * A narrower version of TypeScript 4.5's Awaited type which Recursively
 * unwraps the "awaited type", emulating the behavior of `await`.
 */
export type Resolved<T> = T extends {
    then(onfulfilled: infer F): any;
} ? F extends (value: infer V) => any ? Resolved<V> : never : T;
/**
 * Represents a client that can integrate with the currently configured {@link Instrumenter}.
 *
 * Create an instance using {@link createTracingClient}.
 */
export interface TracingClient {
    /**
     * Wraps a callback in a tracing span, calls the callback, and closes the span.
     *
     * This is the primary interface for using Tracing and will handle error recording as well as setting the status on the span.
     *
     * Both synchronous and asynchronous functions will be awaited in order to reflect the result of the callback on the span.
     *
     * Example:
     *
     * ```ts snippet:with_span_example
     * import { createTracingClient } from "@azure/core-tracing";
     *
     * const tracingClient = createTracingClient({
     *   namespace: "test.namespace",
     *   packageName: "test-package",
     *   packageVersion: "1.0.0",
     * });
     * const options = {};
     * const myOperationResult = await tracingClient.withSpan(
     *   "myClassName.myOperationName",
     *   options,
     *   (updatedOptions) => {
     *     // Do something with the updated options.
     *     return "myOperationResult";
     *   },
     * );
     * ```
     * @param name - The name of the span. By convention this should be `${className}.${methodName}`.
     * @param operationOptions - The original options passed to the method. The callback will receive these options with the newly created {@link TracingContext}.
     * @param callback - The callback to be invoked with the updated options and newly created {@link TracingSpan}.
     */
    withSpan<Options extends {
        tracingOptions?: OperationTracingOptions;
    }, Callback extends (updatedOptions: Options, span: Omit<TracingSpan, "end">) => ReturnType<Callback>>(name: string, operationOptions: Options, callback: Callback, spanOptions?: TracingSpanOptions): Promise<Resolved<ReturnType<Callback>>>;
    /**
     * Starts a given span but does not set it as the active span.
     *
     * You must end the span using {@link TracingSpan.end}.
     *
     * Most of the time you will want to use {@link withSpan} instead.
     *
     * @param name - The name of the span. By convention this should be `${className}.${methodName}`.
     * @param operationOptions - The original operation options.
     * @param spanOptions - The options to use when creating the span.
     *
     * @returns A {@link TracingSpan} and the updated operation options.
     */
    startSpan<Options extends {
        tracingOptions?: OperationTracingOptions;
    }>(name: string, operationOptions?: Options, spanOptions?: TracingSpanOptions): {
        span: TracingSpan;
        updatedOptions: OptionsWithTracingContext<Options>;
    };
    /**
     * Wraps a callback with an active context and calls the callback.
     * Depending on the implementation, this may set the globally available active context.
     *
     * Useful when you want to leave the boundaries of the SDK (make a request or callback to user code) and are unable to use the {@link withSpan} API.
     *
     * @param context - The {@link TracingContext} to use as the active context in the scope of the callback.
     * @param callback - The callback to be invoked with the given context set as the globally active context.
     * @param callbackArgs - The callback arguments.
     */
    withContext<CallbackArgs extends unknown[], Callback extends (...args: CallbackArgs) => ReturnType<Callback>>(context: TracingContext, callback: Callback, ...callbackArgs: CallbackArgs): ReturnType<Callback>;
    /**
     * Parses a traceparent header value into a {@link TracingSpanContext}.
     *
     * @param traceparentHeader - The traceparent header to parse.
     * @returns An implementation-specific identifier for the span.
     */
    parseTraceparentHeader(traceparentHeader: string): TracingContext | undefined;
    /**
     * Creates a set of request headers to propagate tracing information to a backend.
     *
     * @param tracingContext - The context containing the span to propagate.
     * @returns The set of headers to add to a request.
     */
    createRequestHeaders(tracingContext?: TracingContext): Record<string, string>;
}
/**
 * Options that can be passed to {@link createTracingClient}
 */
export interface TracingClientOptions {
    /** The value of the az.namespace tracing attribute on newly created spans. */
    namespace: string;
    /** The name of the package invoking this trace. */
    packageName: string;
    /** An optional version of the package invoking this trace. */
    packageVersion?: string;
}
/** The kind of span. */
export type TracingSpanKind = "client" | "server" | "producer" | "consumer" | "internal";
/** Options used to configure the newly created span. */
export interface TracingSpanOptions {
    /** The kind of span. Implementations should default this to "client". */
    spanKind?: TracingSpanKind;
    /** A collection of {@link TracingSpanLink} to link to this span. */
    spanLinks?: TracingSpanLink[];
    /** Initial set of attributes to set on a span. */
    spanAttributes?: {
        [key: string]: unknown;
    };
}
/** A pointer from the current {@link TracingSpan} to another span in the same or a different trace. */
export interface TracingSpanLink {
    /** The {@link TracingContext} containing the span context to link to. */
    tracingContext: TracingContext;
    /** A set of attributes on the link. */
    attributes?: {
        [key: string]: unknown;
    };
}
/**
 * Represents an implementation agnostic instrumenter.
 */
export interface Instrumenter {
    /**
     * Creates a new {@link TracingSpan} with the given name and options and sets it on a new context.
     * @param name - The name of the span. By convention this should be `${className}.${methodName}`.
     * @param spanOptions - The options to use when creating the span.
     *
     * @returns A {@link TracingSpan} that can be used to end the span, and the context this span has been set on.
     */
    startSpan(name: string, spanOptions: InstrumenterSpanOptions): {
        span: TracingSpan;
        tracingContext: TracingContext;
    };
    /**
     * Wraps a callback with an active context and calls the callback.
     * Depending on the implementation, this may set the globally available active context.
     *
     * @param context - The {@link TracingContext} to use as the active context in the scope of the callback.
     * @param callback - The callback to be invoked with the given context set as the globally active context.
     * @param callbackArgs - The callback arguments.
     */
    withContext<CallbackArgs extends unknown[], Callback extends (...args: CallbackArgs) => ReturnType<Callback>>(context: TracingContext, callback: Callback, ...callbackArgs: CallbackArgs): ReturnType<Callback>;
    /**
     * Provides an implementation-specific method to parse a {@link https://www.w3.org/TR/trace-context/#traceparent-header}
     * into a {@link TracingSpanContext} which can be used to link non-parented spans together.
     */
    parseTraceparentHeader(traceparentHeader: string): TracingContext | undefined;
    /**
     * Provides an implementation-specific method to serialize a {@link TracingSpan} to a set of headers.
     * @param tracingContext - The context containing the span to serialize.
     */
    createRequestHeaders(tracingContext?: TracingContext): Record<string, string>;
}
/**
 * Options passed to {@link Instrumenter.startSpan} as a superset of {@link TracingSpanOptions}.
 */
export interface InstrumenterSpanOptions extends TracingSpanOptions {
    /** The name of the package invoking this trace. */
    packageName: string;
    /** The version of the package invoking this trace. */
    packageVersion?: string;
    /** The current tracing context. Defaults to an implementation-specific "active" context. */
    tracingContext?: TracingContext;
}
/**
 * Status representing a successful operation that can be sent to {@link TracingSpan.setStatus}
 */
export type SpanStatusSuccess = {
    status: "success";
};
/**
 * Status representing an error that can be sent to {@link TracingSpan.setStatus}
 */
export type SpanStatusError = {
    status: "error";
    error?: Error | string;
};
/**
 * Represents the statuses that can be passed to {@link TracingSpan.setStatus}.
 *
 * By default, all spans will be created with status "unset".
 */
export type SpanStatus = SpanStatusSuccess | SpanStatusError;
/**
 * Represents options you can pass to {@link TracingSpan.addEvent}.
 */
export interface AddEventOptions {
    /**
     * A set of attributes to attach to the event.
     */
    attributes?: Record<string, unknown>;
    /**
     * The start time of the event.
     */
    startTime?: Date;
}
/**
 * Represents an implementation agnostic tracing span.
 */
export interface TracingSpan {
    /**
     * Sets the status of the span. When an error is provided, it will be recorded on the span as well.
     *
     * @param status - The {@link SpanStatus} to set on the span.
     */
    setStatus(status: SpanStatus): void;
    /**
     * Sets a given attribute on a span.
     *
     * @param name - The attribute's name.
     * @param value - The attribute's value to set. May be any non-nullish value.
     */
    setAttribute(name: string, value: unknown): void;
    /**
     * Ends the span.
     */
    end(): void;
    /**
     * Records an exception on a {@link TracingSpan} without modifying its status.
     *
     * When recording an unhandled exception that should fail the span, please use {@link TracingSpan.setStatus} instead.
     *
     * @param exception - The exception to record on the span.
     *
     */
    recordException(exception: Error | string): void;
    /**
     * Returns true if this {@link TracingSpan} is recording information.
     *
     * Depending on the span implementation, this may return false if the span is not being sampled.
     */
    isRecording(): boolean;
    /**
     * Adds an event to the span.
     */
    addEvent?(name: string, options?: AddEventOptions): void;
}
/** An immutable context bag of tracing values for the current operation. */
export interface TracingContext {
    /**
     * Sets a given object on a context.
     * @param key - The key of the given context value.
     * @param value - The value to set on the context.
     *
     * @returns - A new context with the given value set.
     */
    setValue(key: symbol, value: unknown): TracingContext;
    /**
     * Gets an object from the context if it exists.
     * @param key - The key of the given context value.
     *
     * @returns - The value of the given context value if it exists, otherwise `undefined`.
     */
    getValue(key: symbol): unknown;
    /**
     * Deletes an object from the context if it exists.
     * @param key - The key of the given context value to delete.
     */
    deleteValue(key: symbol): TracingContext;
}
/**
 * Tracing options to set on an operation.
 */
export interface OperationTracingOptions {
    /** The context to use for created Tracing Spans. */
    tracingContext?: TracingContext;
}
/**
 * A utility type for when we know a TracingContext has been set
 * as part of an operation's options.
 */
export type OptionsWithTracingContext<Options extends {
    tracingOptions?: OperationTracingOptions;
}> = Options & {
    tracingOptions: {
        tracingContext: TracingContext;
    };
};
//# sourceMappingURL=interfaces.d.ts.map