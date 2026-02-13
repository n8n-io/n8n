import { Service } from '@n8n/di';
import type {
	StartSpanOptions as SentryStartSpanOptions,
	SpanContextData as SentrySpanContextData,
	SpanAttributes as SentrySpanAttributes,
} from '@sentry/core';
import type Sentry from '@sentry/node';
import type { INode, IWorkflowBase } from 'n8n-workflow';

import { NoopTracing } from './noop-tracing';

export type StartSpanOpts = SentryStartSpanOptions;
export type Span = Sentry.Span;
export type SpanContextData = SentrySpanContextData;
export type SpanAttributes = SentrySpanAttributes;

/**
 * Interface for concrete tracing implementations
 */
export interface Tracer {
	startSpan<T>(options: StartSpanOpts, spanCb: (span: Span) => Promise<T>): Promise<T>;
}

const COMMON_TRACE_ATTRIBUTES = {
	workflow: {
		id: 'n8n.workflow.id',
		name: 'n8n.workflow.name',
	},
	node: {
		id: 'n8n.node.id',
		name: 'n8n.node.name',
		type: 'n8n.node.type',
		typeVersion: 'n8n.node.type_version',
	},
} as const;

export const enum SpanStatus {
	ok = 1,
	error = 2,
}

/**
 * Class to instrument the application with tracing. This class is a
 * singleton that delegates to the actual tracing implementation. The
 * tracing is active only if Sentry has been configured and tracing sampling
 * is enabled.
 *
 * @example
 * ```ts
 * Tracing.startSpan({
 * 	 name: "My Operation",
 *   attributes: {
 *     [Tracing.commonAttrs.workflow.id]: workflow.id,
 *   }
 * }, async (span) => {
 *   // Do the operation that is then traced
 * });
 * ```
 */
@Service()
export class Tracing {
	private tracer: Tracer = new NoopTracing();

	/** Common n8n specific attribute names */
	commonAttrs = COMMON_TRACE_ATTRIBUTES;

	/** Set the concrete tracing implementation to use */
	setTracingImplementation(tracing: Tracer): void {
		this.tracer = tracing;
	}

	/**
	 * Start a span and execute the callback with the span. If the `spanCb` throws,
	 * the span will be marked automatically as errored.
	 */
	async startSpan<T>(options: StartSpanOpts, spanCb: (span: Span) => Promise<T>): Promise<T> {
		return await this.tracer.startSpan(options, spanCb);
	}

	/** Pick common attributes for a workflow */
	pickWorkflowAttributes(workflow: Partial<Pick<IWorkflowBase, 'id' | 'name'>>): SpanAttributes {
		return {
			[this.commonAttrs.workflow.id]: workflow.id,
			[this.commonAttrs.workflow.name]: workflow.name,
		};
	}

	/** Pick common attributes for a node */
	pickNodeAttributes(
		node: Partial<Pick<INode, 'id' | 'name' | 'type' | 'typeVersion'>>,
	): SpanAttributes {
		return {
			[this.commonAttrs.node.id]: node.id,
			[this.commonAttrs.node.name]: node.name,
			[this.commonAttrs.node.type]: node.type,
			[this.commonAttrs.node.typeVersion]: node.typeVersion,
		};
	}
}
