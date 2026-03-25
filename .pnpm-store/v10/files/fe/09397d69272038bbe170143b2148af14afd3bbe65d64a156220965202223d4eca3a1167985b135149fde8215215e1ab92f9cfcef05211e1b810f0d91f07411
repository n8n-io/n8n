"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvokeStore = void 0;
const async_hooks_1 = require("async_hooks");
// AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA provides an escape hatch since we're modifying the global object which may not be expected to a customer's handler.
const noGlobalAwsLambda = process.env["AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA"] === "1" ||
    process.env["AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA"] === "true";
if (!noGlobalAwsLambda) {
    globalThis.awslambda = globalThis.awslambda || {};
}
const PROTECTED_KEYS = {
    REQUEST_ID: Symbol("_AWS_LAMBDA_REQUEST_ID"),
    X_RAY_TRACE_ID: Symbol("_AWS_LAMBDA_X_RAY_TRACE_ID"),
};
/**
 * InvokeStore implementation class
 */
class InvokeStoreImpl {
    static storage = new async_hooks_1.AsyncLocalStorage();
    // Protected keys for Lambda context fields
    static PROTECTED_KEYS = PROTECTED_KEYS;
    /**
     * Initialize and run code within an invoke context
     */
    static run(context, fn) {
        return this.storage.run({ ...context }, fn);
    }
    /**
     * Get the complete current context
     */
    static getContext() {
        return this.storage.getStore();
    }
    /**
     * Get a specific value from the context by key
     */
    static get(key) {
        const context = this.storage.getStore();
        return context?.[key];
    }
    /**
     * Set a custom value in the current context
     * Protected Lambda context fields cannot be overwritten
     */
    static set(key, value) {
        if (this.isProtectedKey(key)) {
            throw new Error(`Cannot modify protected Lambda context field`);
        }
        const context = this.storage.getStore();
        if (context) {
            context[key] = value;
        }
    }
    /**
     * Get the current request ID
     */
    static getRequestId() {
        return this.get(this.PROTECTED_KEYS.REQUEST_ID) ?? "-";
    }
    /**
     * Get the current X-ray trace ID
     */
    static getXRayTraceId() {
        return this.get(this.PROTECTED_KEYS.X_RAY_TRACE_ID);
    }
    /**
     * Check if we're currently within an invoke context
     */
    static hasContext() {
        return this.storage.getStore() !== undefined;
    }
    /**
     * Check if a key is protected (readonly Lambda context field)
     */
    static isProtectedKey(key) {
        return (key === this.PROTECTED_KEYS.REQUEST_ID ||
            key === this.PROTECTED_KEYS.X_RAY_TRACE_ID);
    }
}
let instance;
if (!noGlobalAwsLambda && globalThis.awslambda?.InvokeStore) {
    instance = globalThis.awslambda.InvokeStore;
}
else {
    instance = InvokeStoreImpl;
    if (!noGlobalAwsLambda && globalThis.awslambda) {
        globalThis.awslambda.InvokeStore = instance;
    }
}
exports.InvokeStore = instance;
