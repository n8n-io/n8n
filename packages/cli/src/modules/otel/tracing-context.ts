import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, type ExecutionEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Context } from '@opentelemetry/api';
import {
	defaultTextMapGetter,
	defaultTextMapSetter,
	propagation,
	ROOT_CONTEXT,
} from '@opentelemetry/api';
import {
	CompositePropagator,
	W3CBaggagePropagator,
	W3CTraceContextPropagator,
} from '@opentelemetry/core';

export type TracingContext = NonNullable<ExecutionEntity['tracingContext']>;

// The execution row is n8n's own carrier, so it keeps one format whatever the outbound settings are.
const rowPropagator = new CompositePropagator({
	propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
});

export function toTracingContext(ctx: Context): TracingContext {
	const carrier: TracingContext = {};
	rowPropagator.inject(ctx, carrier, defaultTextMapSetter);
	return carrier;
}

export function fromTracingContext(tracingContext?: TracingContext): Context {
	if (!tracingContext) return ROOT_CONTEXT;
	return rowPropagator.extract(ROOT_CONTEXT, tracingContext, defaultTextMapGetter);
}

export function extractTracingContext(
	headers: Record<string, string | string[] | undefined>,
): TracingContext | undefined {
	const tracingContext = toTracingContext(propagation.extract(ROOT_CONTEXT, headers));
	return Object.keys(tracingContext).length > 0 ? tracingContext : undefined;
}

@Service()
export class TraceContextService {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly logger: Logger,
	) {}

	async persist(executionId: string, tracingContext: TracingContext): Promise<void> {
		try {
			await this.executionRepository.update(executionId, { tracingContext });
		} catch (error) {
			this.logger.error('Failed to persist tracing context', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async get(executionId: string): Promise<TracingContext | undefined> {
		try {
			const execution = await this.executionRepository.findOne({
				where: { id: executionId },
				select: ['tracingContext'],
				// An error workflow can start after its parent's unsaved row was soft-deleted.
				withDeleted: true,
			});
			return execution?.tracingContext ?? undefined;
		} catch (error) {
			this.logger.error('Failed to load tracing context', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}
}
