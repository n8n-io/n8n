import type { OtelConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { trace, SpanStatusCode } from '@opentelemetry/api';

let sdkInstance: { shutdown(): Promise<void> } | undefined;

const wrappedInstances = new WeakSet<object>();

/** Classes excluded from automatic method-level tracing. */
const EXCLUDED_CLASSES = new Set(['DataSource', 'DbConnection', 'TaskBroker']);

/**
 * Wrap every own prototype method of `instance` in an OTEL span.
 * Skips getters, setters, constructor, private-looking (`_` prefixed),
 * and anything already wrapped.
 */
function wrapInstanceMethods(instance: object): void {
	if (wrappedInstances.has(instance)) return;
	wrappedInstances.add(instance);

	const proto = Object.getPrototypeOf(instance) as Record<string, unknown> | null;
	if (!proto || proto === Object.prototype) return;

	const className: string = (instance.constructor?.name as string | undefined) ?? 'Unknown';
	if (EXCLUDED_CLASSES.has(className)) return;

	const tracer = trace.getTracer('n8n');

	for (const key of Object.getOwnPropertyNames(proto)) {
		if (key === 'constructor') continue;

		const desc = Object.getOwnPropertyDescriptor(proto, key);
		if (!desc || typeof desc.value !== 'function') continue;

		const original = desc.value as (...args: unknown[]) => unknown;
		const spanName = `${className}.${key}`;

		// Replace with a traced wrapper that preserves `this`
		(instance as Record<string, unknown>)[key] = function (this: unknown, ...args: unknown[]) {
			return tracer.startActiveSpan(spanName, (span) => {
				try {
					const result = original.apply(this, args);
					// Handle both sync and async methods
					if (result instanceof Promise) {
						return result.then(
							(value: unknown) => {
								span.setStatus({ code: SpanStatusCode.OK });
								span.end();
								return value;
							},
							(error: unknown) => {
								span.setStatus({
									code: SpanStatusCode.ERROR,
									message: error instanceof Error ? error.message : String(error),
								});
								if (error instanceof Error) span.recordException(error);
								span.end();
								throw error;
							},
						);
					}
					span.setStatus({ code: SpanStatusCode.OK });
					span.end();
					return result;
				} catch (error) {
					span.setStatus({
						code: SpanStatusCode.ERROR,
						message: error instanceof Error ? error.message : String(error),
					});
					if (error instanceof Error) span.recordException(error);
					span.end();
					throw error;
				}
			});
		};
	}
}

/**
 * Monkey-patch `Container.get()` so every DI-resolved instance gets
 * automatic OTEL tracing on all its methods.
 */
function patchContainer(): void {
	const originalGet = Container.get.bind(Container);

	Container.get = function <T>(type: unknown): T {
		const instance = originalGet(type as Parameters<typeof originalGet>[0]);
		if (instance && typeof instance === 'object') {
			wrapInstanceMethods(instance);
		}
		return instance as T;
	};
}

/**
 * Initialize the OpenTelemetry SDK. Must be called **before** any HTTP/DB
 * connections are established, so auto-instrumentations can monkey-patch modules.
 *
 * Also patches the DI container so every resolved service/controller/repository
 * gets automatic method-level tracing.
 */
export async function initOtel(config: OtelConfig): Promise<void> {
	const { NodeSDK } = await import('@opentelemetry/sdk-node');
	const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
	const { Resource } = await import('@opentelemetry/resources');
	const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions');

	let exporter;
	if (config.otlpProtocol === 'grpc') {
		const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-grpc');
		exporter = new OTLPTraceExporter({ url: config.otlpEndpoint });
	} else {
		const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
		exporter = new OTLPTraceExporter({
			url: `${config.otlpEndpoint}/v1/traces`,
		});
	}

	const { TraceIdRatioBasedSampler } = await import('@opentelemetry/sdk-trace-node');

	const sdk = new NodeSDK({
		resource: new Resource({
			[ATTR_SERVICE_NAME]: config.serviceName,
		}),
		traceExporter: exporter,
		instrumentations: [
			getNodeAutoInstrumentations({
				'@opentelemetry/instrumentation-fs': { enabled: false },
				'@opentelemetry/instrumentation-http': {
					requestHook: (span, request) => {
						const method = 'method' in request ? request.method : undefined;
						const url = 'url' in request ? request.url : undefined;
						if (method && url) {
							span.updateName(`${method} ${url}`);
						}
					},
				},
			}),
		],
		sampler: new TraceIdRatioBasedSampler(config.sampleRate),
	});

	sdk.start();
	sdkInstance = sdk;

	patchContainer();
}

/**
 * Gracefully shut down the OTEL SDK, flushing any pending spans.
 */
export async function shutdownOtel(): Promise<void> {
	if (sdkInstance) {
		await sdkInstance.shutdown();
		sdkInstance = undefined;
	}
}
