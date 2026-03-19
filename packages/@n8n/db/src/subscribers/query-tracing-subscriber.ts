import { EventSubscriber } from '@n8n/typeorm';
import type { EntitySubscriberInterface, QueryRunner } from '@n8n/typeorm';
import type { BeforeQueryEvent, AfterQueryEvent } from '@n8n/typeorm/subscriber/event/QueryEvent';
import type { Span } from '@opentelemetry/api';
import { trace, SpanStatusCode } from '@opentelemetry/api';

/**
 * TypeORM subscriber that creates OpenTelemetry spans for every database query.
 * Uses `@opentelemetry/api` directly — noop when no SDK is registered.
 */
@EventSubscriber()
export class QueryTracingSubscriber implements EntitySubscriberInterface {
	private readonly tracer = trace.getTracer('n8n');

	beforeQuery(event: BeforeQueryEvent<unknown>) {
		const dbSystem = this.getDbSystem(event.queryRunner);
		const spanName = `db.query ${event.query.length > 80 ? event.query.slice(0, 80) + '…' : event.query}`;
		const span = this.tracer.startSpan(spanName, {
			attributes: {
				'db.system': dbSystem,
				'db.statement': event.query,
				'db.parameters': event.parameters ? JSON.stringify(event.parameters) : undefined,
			},
		});

		// Stash span on the queryRunner so we can end it in afterQuery
		(event.queryRunner as QueryRunnerWithSpan).__otelSpan = span;
	}

	afterQuery(event: AfterQueryEvent<unknown>) {
		const span = (event.queryRunner as QueryRunnerWithSpan).__otelSpan;
		if (span) {
			if (event.success) {
				span.setStatus({ code: SpanStatusCode.OK });
			} else {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: event.error instanceof Error ? event.error.message : String(event.error),
				});
				if (event.error instanceof Error) {
					span.recordException(event.error);
				}
			}
			if (event.executionTime !== undefined) {
				span.setAttribute('db.execution_time_ms', event.executionTime);
			}
			span.end();
			delete (event.queryRunner as QueryRunnerWithSpan).__otelSpan;
		}
	}

	private getDbSystem(queryRunner: QueryRunner): string {
		const driverName = (queryRunner.connection?.options as { type?: string })?.type;
		if (driverName === 'postgres') return 'postgresql';
		if (driverName === 'sqlite' || driverName === 'better-sqlite3') return 'sqlite';
		return driverName ?? 'unknown';
	}
}

interface QueryRunnerWithSpan extends QueryRunner {
	__otelSpan?: Span;
}
