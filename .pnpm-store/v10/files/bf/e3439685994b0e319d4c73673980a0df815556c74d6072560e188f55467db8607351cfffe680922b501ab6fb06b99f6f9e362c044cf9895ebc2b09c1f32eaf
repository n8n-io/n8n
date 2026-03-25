// Should not import any OTEL packages to avoid pulling in optional deps.
import { getOtelEnabled } from "../utils/env.js";
class MockTracer {
    constructor() {
        Object.defineProperty(this, "hasWarned", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
    }
    startActiveSpan(_name, ...args) {
        if (!this.hasWarned && getOtelEnabled()) {
            console.warn("You have enabled OTEL export via the `OTEL_ENABLED` or `LANGSMITH_OTEL_ENABLED` environment variable, but have not initialized the required OTEL instances. " +
                'Please add:\n```\nimport { initializeOTEL } from "langsmith/experimental/otel/setup";\ninitializeOTEL();\n```\nat the beginning of your code.');
            this.hasWarned = true;
        }
        // Handle different overloads:
        // startActiveSpan(name, fn)
        // startActiveSpan(name, options, fn)
        // startActiveSpan(name, options, context, fn)
        let fn;
        if (args.length === 1 && typeof args[0] === "function") {
            fn = args[0];
        }
        else if (args.length === 2 && typeof args[1] === "function") {
            fn = args[1];
        }
        else if (args.length === 3 && typeof args[2] === "function") {
            fn = args[2];
        }
        if (typeof fn === "function") {
            return fn();
        }
        return undefined;
    }
}
class MockOTELTrace {
    constructor() {
        Object.defineProperty(this, "mockTracer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new MockTracer()
        });
    }
    getTracer(_name, _version) {
        return this.mockTracer;
    }
    getActiveSpan() {
        return undefined;
    }
    setSpan(context, _span) {
        return context;
    }
    getSpan(_context) {
        return undefined;
    }
    setSpanContext(context, _spanContext) {
        return context;
    }
    getTracerProvider() {
        return undefined;
    }
    setGlobalTracerProvider(_tracerProvider) {
        return false;
    }
}
class MockOTELContext {
    active() {
        return {};
    }
    with(_context, fn) {
        return fn();
    }
}
const OTEL_TRACE_KEY = Symbol.for("ls:otel_trace");
const OTEL_CONTEXT_KEY = Symbol.for("ls:otel_context");
const OTEL_GET_DEFAULT_OTLP_TRACER_PROVIDER_KEY = Symbol.for("ls:otel_get_default_otlp_tracer_provider");
const mockOTELTrace = new MockOTELTrace();
const mockOTELContext = new MockOTELContext();
class OTELProvider {
    getTraceInstance() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return globalThis[OTEL_TRACE_KEY] ?? mockOTELTrace;
    }
    getContextInstance() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return globalThis[OTEL_CONTEXT_KEY] ?? mockOTELContext;
    }
    initializeGlobalInstances(otel) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (globalThis[OTEL_TRACE_KEY] === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            globalThis[OTEL_TRACE_KEY] = otel.trace;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (globalThis[OTEL_CONTEXT_KEY] === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            globalThis[OTEL_CONTEXT_KEY] = otel.context;
        }
    }
    setDefaultOTLPTracerComponents(components) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalThis[OTEL_GET_DEFAULT_OTLP_TRACER_PROVIDER_KEY] = components;
    }
    getDefaultOTLPTracerComponents() {
        return (globalThis[OTEL_GET_DEFAULT_OTLP_TRACER_PROVIDER_KEY] ??
            undefined);
    }
}
export const OTELProviderSingleton = new OTELProvider();
/**
 * Get the current OTEL trace instance.
 * Returns a mock implementation if OTEL is not available.
 */
export function getOTELTrace() {
    return OTELProviderSingleton.getTraceInstance();
}
/**
 * Get the current OTEL context instance.
 * Returns a mock implementation if OTEL is not available.
 */
export function getOTELContext() {
    return OTELProviderSingleton.getContextInstance();
}
/**
 * Initialize the global OTEL instances.
 * Should be called once when OTEL packages are available.
 */
export function setOTELInstances(otel) {
    OTELProviderSingleton.initializeGlobalInstances(otel);
}
/**
 * Set a getter function for the default OTLP tracer provider.
 * This allows lazy initialization of the tracer provider.
 */
export function setDefaultOTLPTracerComponents(components) {
    OTELProviderSingleton.setDefaultOTLPTracerComponents(components);
}
/**
 * Get the default OTLP tracer provider instance.
 * Returns undefined if not set.
 */
export function getDefaultOTLPTracerComponents() {
    return OTELProviderSingleton.getDefaultOTLPTracerComponents();
}
