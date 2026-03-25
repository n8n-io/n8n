const require_env = require('../utils/env.cjs');

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/singletons/otel.js
var MockTracer = class {
	constructor() {
		Object.defineProperty(this, "hasWarned", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: false
		});
	}
	startActiveSpan(_name, ...args) {
		if (!this.hasWarned && require_env.getOtelEnabled()) {
			console.warn("You have enabled OTEL export via the `OTEL_ENABLED` or `LANGSMITH_OTEL_ENABLED` environment variable, but have not initialized the required OTEL instances. Please add:\n```\nimport { initializeOTEL } from \"langsmith/experimental/otel/setup\";\ninitializeOTEL();\n```\nat the beginning of your code.");
			this.hasWarned = true;
		}
		let fn;
		if (args.length === 1 && typeof args[0] === "function") fn = args[0];
		else if (args.length === 2 && typeof args[1] === "function") fn = args[1];
		else if (args.length === 3 && typeof args[2] === "function") fn = args[2];
		if (typeof fn === "function") return fn();
		return void 0;
	}
};
var MockOTELTrace = class {
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
		return void 0;
	}
	setSpan(context, _span) {
		return context;
	}
	getSpan(_context) {
		return void 0;
	}
	setSpanContext(context, _spanContext) {
		return context;
	}
	getTracerProvider() {
		return void 0;
	}
	setGlobalTracerProvider(_tracerProvider) {
		return false;
	}
};
var MockOTELContext = class {
	active() {
		return {};
	}
	with(_context, fn) {
		return fn();
	}
};
const OTEL_TRACE_KEY = Symbol.for("ls:otel_trace");
const OTEL_CONTEXT_KEY = Symbol.for("ls:otel_context");
const OTEL_GET_DEFAULT_OTLP_TRACER_PROVIDER_KEY = Symbol.for("ls:otel_get_default_otlp_tracer_provider");
const mockOTELTrace = new MockOTELTrace();
const mockOTELContext = new MockOTELContext();
var OTELProvider = class {
	getTraceInstance() {
		return globalThis[OTEL_TRACE_KEY] ?? mockOTELTrace;
	}
	getContextInstance() {
		return globalThis[OTEL_CONTEXT_KEY] ?? mockOTELContext;
	}
	initializeGlobalInstances(otel) {
		if (globalThis[OTEL_TRACE_KEY] === void 0) globalThis[OTEL_TRACE_KEY] = otel.trace;
		if (globalThis[OTEL_CONTEXT_KEY] === void 0) globalThis[OTEL_CONTEXT_KEY] = otel.context;
	}
	setDefaultOTLPTracerComponents(components) {
		globalThis[OTEL_GET_DEFAULT_OTLP_TRACER_PROVIDER_KEY] = components;
	}
	getDefaultOTLPTracerComponents() {
		return globalThis[OTEL_GET_DEFAULT_OTLP_TRACER_PROVIDER_KEY] ?? void 0;
	}
};
const OTELProviderSingleton = new OTELProvider();
/**
* Get the current OTEL trace instance.
* Returns a mock implementation if OTEL is not available.
*/
function getOTELTrace() {
	return OTELProviderSingleton.getTraceInstance();
}
/**
* Get the current OTEL context instance.
* Returns a mock implementation if OTEL is not available.
*/
function getOTELContext() {
	return OTELProviderSingleton.getContextInstance();
}
/**
* Get the default OTLP tracer provider instance.
* Returns undefined if not set.
*/
function getDefaultOTLPTracerComponents() {
	return OTELProviderSingleton.getDefaultOTLPTracerComponents();
}

//#endregion
exports.getDefaultOTLPTracerComponents = getDefaultOTLPTracerComponents;
exports.getOTELContext = getOTELContext;
exports.getOTELTrace = getOTELTrace;
//# sourceMappingURL=otel.cjs.map