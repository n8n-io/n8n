interface Context {
    [key: string]: unknown;
    [key: symbol]: unknown;
}
declare global {
    var awslambda: {
        InvokeStore?: InvokeStoreBase;
        [key: string]: unknown;
    };
}
/**
 * Base class for AWS Lambda context storage implementations.
 * Provides core functionality for managing Lambda execution context.
 *
 * Implementations handle either single-context (InvokeStoreSingle) or
 * multi-context (InvokeStoreMulti) scenarios based on Lambda's execution environment.
 *
 * @public
 */
export declare abstract class InvokeStoreBase {
    static readonly PROTECTED_KEYS: {
        readonly REQUEST_ID: symbol;
        readonly X_RAY_TRACE_ID: symbol;
        readonly TENANT_ID: symbol;
    };
    abstract getContext(): Context | undefined;
    abstract hasContext(): boolean;
    abstract get<T = unknown>(key: string | symbol): T | undefined;
    abstract set<T = unknown>(key: string | symbol, value: T): void;
    abstract run<T>(context: Context, fn: () => T): T;
    protected isProtectedKey(key: string | symbol): boolean;
    getRequestId(): string;
    getXRayTraceId(): string | undefined;
    getTenantId(): string | undefined;
}
/**
 * Provides access to AWS Lambda execution context storage.
 * Supports both single-context and multi-context environments through different implementations.
 *
 * The store manages protected Lambda context fields and allows storing/retrieving custom values
 * within the execution context.
 * @public
 */
export declare namespace InvokeStore {
    function getInstanceAsync(): Promise<InvokeStoreBase>;
    const _testing: {
        reset: () => void;
    } | undefined;
}
export {};
