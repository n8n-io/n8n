import type { Resource } from '@opentelemetry/resources';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

export function withResource(span: ReadableSpan, resource: Resource): ReadableSpan {
	return new Proxy(span, {
		get: (target, property, receiver) =>
			property === 'resource' ? resource : Reflect.get(target, property, receiver),
	});
}
