import type { Tracer } from '@opentelemetry/api';

import type { SpanRegistry } from '../span-registry';

export interface SpanHandler<T> {
	handle(ctx: T, spans: SpanRegistry, tracer: Tracer): void;
}
