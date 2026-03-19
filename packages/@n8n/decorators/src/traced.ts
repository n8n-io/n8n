import { trace, SpanStatusCode } from '@opentelemetry/api';

export interface TracedOptions {
	/** Custom span name. Defaults to `ClassName.methodName`. */
	name?: string;
}

/**
 * Method decorator that wraps the call in an OpenTelemetry span.
 * Uses `@opentelemetry/api` directly — zero-cost noop when no SDK is registered.
 */
export const Traced =
	(options: TracedOptions = {}): MethodDecorator =>
	(_target, propertyKey, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

		descriptor.value = async function (...args: unknown[]) {
			const spanName = options.name ?? `${this.constructor.name}.${String(propertyKey)}`;
			return await trace.getTracer('n8n').startActiveSpan(spanName, async (span) => {
				try {
					const result = await originalMethod.apply(this, args);
					span.setStatus({ code: SpanStatusCode.OK });
					return result;
				} catch (error) {
					span.setStatus({
						code: SpanStatusCode.ERROR,
						message: error instanceof Error ? error.message : String(error),
					});
					if (error instanceof Error) {
						span.recordException(error);
					}
					throw error;
				} finally {
					span.end();
				}
			});
		};

		return descriptor;
	};
