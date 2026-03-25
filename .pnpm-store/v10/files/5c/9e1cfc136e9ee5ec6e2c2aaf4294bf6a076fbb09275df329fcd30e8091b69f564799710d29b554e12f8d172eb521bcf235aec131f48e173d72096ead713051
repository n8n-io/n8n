class Traces {
	/**
	* otel stands for OpenTelemetry
	*/
	#otel = null;
	#sdk = null;
	#init = null;
	#noopSpan = createNoopSpan();
	#noopContext = createNoopContext();
	constructor(options) {
		if (options.enabled) {
			const apiInit = import('@opentelemetry/api').then((api) => {
				this.#otel = {
					tracer: api.trace.getTracer(options.tracerName || "vitest"),
					context: api.context,
					propagation: api.propagation,
					trace: api.trace,
					SpanKind: api.SpanKind,
					SpanStatusCode: api.SpanStatusCode
				};
			}).catch(() => {
				throw new Error(`"@opentelemetry/api" is not installed locally. Make sure you have setup OpenTelemetry instrumentation: https://vitest.dev/guide/open-telemetry`);
			});
			const sdkInit = (options.sdkPath ? import(options.sdkPath) : Promise.resolve()).catch((cause) => {
				throw new Error(`Failed to import custom OpenTelemetry SDK script (${options.sdkPath}): ${cause.message}`);
			});
			this.#init = Promise.all([sdkInit, apiInit]).then(([sdk]) => {
				if (sdk != null) {
					if (sdk.default != null && typeof sdk.default === "object" && typeof sdk.default.shutdown === "function") this.#sdk = sdk.default;
					else if (options.watchMode !== true && process.env.VITEST_MODE !== "watch") console.warn(`OpenTelemetry instrumentation module (${options.sdkPath}) does not have a default export with a "shutdown" method. Vitest won't be able to ensure that all traces are processed in time. Try running Vitest in watch mode instead.`);
				}
			}).finally(() => {
				this.#init = null;
			});
		}
	}
	isEnabled() {
		return !!this.#otel;
	}
	/**
	* @internal
	*/
	async waitInit() {
		if (this.#init) await this.#init;
		return this;
	}
	/**
	* @internal
	*/
	startContextSpan(name, currentContext) {
		if (!this.#otel) return {
			span: this.#noopSpan,
			context: this.#noopContext
		};
		const activeContext = currentContext || this.#otel.context.active();
		const span = this.#otel.tracer.startSpan(name, {}, activeContext);
		return {
			span,
			context: this.#otel.trace.setSpan(activeContext, span)
		};
	}
	/**
	* @internal
	*/
	getContextFromCarrier(carrier) {
		if (!this.#otel) return this.#noopContext;
		const activeContext = this.#otel.context.active();
		if (!carrier) return activeContext;
		return this.#otel.propagation.extract(activeContext, carrier);
	}
	/**
	* @internal
	*/
	getContextCarrier(context) {
		if (!this.#otel) return;
		const carrier = {};
		this.#otel.propagation.inject(context || this.#otel.context.active(), carrier);
		return carrier;
	}
	#callActiveSpan(span, callback) {
		const otel = this.#otel;
		let result;
		try {
			result = callback(span);
			if (result instanceof Promise) return result.catch((error) => {
				span.recordException({
					name: error.name,
					message: error.message,
					stack: error.stack
				});
				span.setStatus({ code: otel.SpanStatusCode.ERROR });
				throw error;
			}).finally(() => span.end());
			return result;
		} catch (error) {
			if (error instanceof Error) {
				span.recordException({
					name: error.name,
					message: error.message,
					stack: error.stack
				});
				span.setStatus({ code: otel.SpanStatusCode.ERROR });
			}
			throw error;
		} finally {
			// end sync callbcak
			if (!(result instanceof Promise)) span.end();
		}
	}
	/**
	* @internal
	*/
	$(name, optionsOrFn, fn) {
		const callback = typeof optionsOrFn === "function" ? optionsOrFn : fn;
		if (!this.#otel) return callback(this.#noopSpan);
		const otel = this.#otel;
		const options = typeof optionsOrFn === "function" ? {} : optionsOrFn;
		const context = options.context;
		if (context) return otel.tracer.startActiveSpan(name, options, context, (span) => this.#callActiveSpan(span, callback));
		return otel.tracer.startActiveSpan(name, options, (span) => this.#callActiveSpan(span, callback));
	}
	/**
	* @internal
	*/
	startSpan(name, options, context) {
		if (!this.#otel) return this.#noopSpan;
		const { tracer } = this.#otel;
		return tracer.startSpan(name, options, context);
	}
	/**
	* @internal
	*/
	async finish() {
		await this.#sdk?.shutdown();
	}
}
function noopSpan() {
	return this;
}
function createNoopSpan() {
	return {
		setAttribute: noopSpan,
		setStatus: noopSpan,
		addEvent: noopSpan,
		addLink: noopSpan,
		addLinks: noopSpan,
		setAttributes: noopSpan,
		updateName: noopSpan,
		end: () => {},
		isRecording: () => false,
		recordException: noopSpan,
		spanContext() {
			return {
				spanId: "",
				traceFlags: 0,
				traceId: ""
			};
		}
	};
}
function noopContext() {
	return this;
}
function createNoopContext() {
	return {
		getValue: noopContext,
		setValue: noopContext,
		deleteValue: noopContext
	};
}

export { Traces as T };
