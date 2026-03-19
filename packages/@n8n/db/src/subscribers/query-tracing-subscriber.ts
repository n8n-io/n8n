import { EventSubscriber } from '@n8n/typeorm';
import type { EntitySubscriberInterface, QueryRunner } from '@n8n/typeorm';
import type { BeforeQueryEvent, AfterQueryEvent } from '@n8n/typeorm/subscriber/event/QueryEvent';
import type { Span } from '@opentelemetry/api';
import { trace, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('n8n');

/** Extract the SQL operation (SELECT, INSERT, etc.) for a low-cardinality span name. */
function getOperationName(query: string): string {
	const match = query.trimStart().match(/^(\w+)/);
	return match ? match[1].toUpperCase() : 'QUERY';
}

/**
 * TypeORM subscriber that creates OpenTelemetry spans for every database query.
 * Uses `@opentelemetry/api` directly — noop when no SDK is registered.
 * Skips all work when there is no active span context (i.e., OTEL is not enabled).
 */
@EventSubscriber()
export class QueryTracingSubscriber implements EntitySubscriberInterface {
	private dbSystem: string | undefined;

	beforeQuery(event: BeforeQueryEvent<unknown>) {
		if (!trace.getSpan(context.active())) return;

		const dbSystem = this.resolveDbSystem(event.queryRunner);
		const span = tracer.startSpan(`db ${getOperationName(event.query)}`, {
			attributes: {
				'db.system': dbSystem,
				'db.statement': event.query,
			},
		});

		(event.queryRunner as QueryRunnerWithSpan).__otelSpan = span;
	}

	afterQuery(event: AfterQueryEvent<unknown>) {
		const span = (event.queryRunner as QueryRunnerWithSpan).__otelSpan;
		if (!span) return;

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

	private resolveDbSystem(queryRunner: QueryRunner): string {
		if (this.dbSystem) return this.dbSystem;
		const driverName = (queryRunner.connection?.options as { type?: string })?.type;
		if (driverName === 'postgres') this.dbSystem = 'postgresql';
		else if (driverName === 'sqlite' || driverName === 'better-sqlite3') this.dbSystem = 'sqlite';
		else this.dbSystem = driverName ?? 'unknown';
		return this.dbSystem;
	}
}

interface QueryRunnerWithSpan extends QueryRunner {
	__otelSpan?: Span;
}
