/**
 * Generic store context that uses protected keys for Lambda fields
 * and allows custom user properties
 */
export interface InvokeStoreContext {
    [key: string | symbol]: unknown;
}
/**
 * InvokeStore implementation class
 */
declare class InvokeStoreImpl {
    private static storage;
    static readonly PROTECTED_KEYS: {
        readonly REQUEST_ID: symbol;
        readonly X_RAY_TRACE_ID: symbol;
    };
    /**
     * Initialize and run code within an invoke context
     */
    static run<T>(context: InvokeStoreContext, fn: () => T | Promise<T>): T | Promise<T>;
    /**
     * Get the complete current context
     */
    static getContext(): InvokeStoreContext | undefined;
    /**
     * Get a specific value from the context by key
     */
    static get<T = unknown>(key: string | symbol): T | undefined;
    /**
     * Set a custom value in the current context
     * Protected Lambda context fields cannot be overwritten
     */
    static set(key: string | symbol, value: unknown): void;
    /**
     * Get the current request ID
     */
    static getRequestId(): string;
    /**
     * Get the current X-ray trace ID
     */
    static getXRayTraceId(): string | undefined;
    /**
     * Check if we're currently within an invoke context
     */
    static hasContext(): boolean;
    /**
     * Check if a key is protected (readonly Lambda context field)
     */
    private static isProtectedKey;
}
export declare const InvokeStore: typeof InvokeStoreImpl;
export {};
