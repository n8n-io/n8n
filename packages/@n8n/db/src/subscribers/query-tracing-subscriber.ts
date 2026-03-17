import { trace, SpanStatusCode, context as otelContext } from '@opentelemetry/api';
import type { EntitySubscriberInterface, QueryRunner } from '@n8n/typeorm';
import { EventSubscriber } from '@n8n/typeorm';
import type { BeforeQueryEvent, AfterQueryEvent } from '@n8n/typeorm/subscriber/event/QueryEvent';

const tracer = trace.getTracer('n8n-db');

/**
 * TypeORM subscriber that creates OpenTelemetry spans for every DB query.
 * Captures SQL statement, execution time, and error status.
 */
@EventSubscriber()
export class QueryTracingSubscriber implements EntitySubscriberInterface {
	private spans = new WeakMap<QueryRunner, ReturnType<typeof tracer.startSpan>>();

	private parentContexts = new WeakMap<QueryRunner, ReturnType<typeof otelContext.active>>();

	beforeQuery(event: BeforeQueryEvent<unknown>) {
		const query = event.query ?? '';
		const op = query.slice(0, 6).toUpperCase().trimEnd();
		const table = this.extractTable(query);
		const spanName = table ? `DB ${op} ${table}` : `DB ${op}`;

		// Capture the current context so the span nests under the active parent
		const parentCtx = otelContext.active();
		this.parentContexts.set(event.queryRunner, parentCtx);

		const span = tracer.startSpan(
			spanName,
			{
				attributes: {
					'db.system': 'typeorm',
					'db.statement': query.length > 2000 ? query.slice(0, 2000) + '…' : query,
				},
			},
			parentCtx,
		);

		this.spans.set(event.queryRunner, span);
	}

	afterQuery(event: AfterQueryEvent<unknown>) {
		const span = this.spans.get(event.queryRunner);
		if (!span) return;

		if (event.executionTime !== undefined) {
			span.setAttribute('db.execution_time_ms', event.executionTime);
		}

		if (!event.success && event.error) {
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: event.error instanceof Error ? event.error.message : String(event.error),
			});
		}

		span.end();
		this.spans.delete(event.queryRunner);
		this.parentContexts.delete(event.queryRunner);
	}

	private extractTable(query: string): string {
		const match = query.match(/(?:FROM|INTO|UPDATE|JOIN)\s+["`]?(\w+)["`]?/i);
		return match?.[1] ?? '';
	}
}
