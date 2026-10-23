import type { Context } from '@opentelemetry/api';
import { createContextKey } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { isRecord } from '@n8n/utils/is-record';

import { ATTR } from './otel.constants';

// A private context key, not baggage: callers can write baggage, but not this key.
const IDENTITY_KEY = createContextKey('n8n.execution_identity');

export type ExecutionIdentity = {
	[ATTR.EXECUTION_ID]: string;
	[ATTR.WORKFLOW_ID]: string;
	[ATTR.WORKFLOW_NAME]?: string;
	[ATTR.PROJECT_ID]?: string;
	[ATTR.PROJECT_NAME]?: string;
};

type ExecutionIdentitySource = {
	executionId: string;
	workflowId: string;
	workflowName?: string;
	projectId?: string;
	projectName?: string;
};

export function buildExecutionIdentity(source: ExecutionIdentitySource): ExecutionIdentity {
	return {
		[ATTR.EXECUTION_ID]: source.executionId,
		[ATTR.WORKFLOW_ID]: source.workflowId,
		...(source.workflowName && { [ATTR.WORKFLOW_NAME]: source.workflowName }),
		...(source.projectId && { [ATTR.PROJECT_ID]: source.projectId }),
		...(source.projectName && { [ATTR.PROJECT_NAME]: source.projectName }),
	};
}

export function toExecutionIdentity(value: unknown): ExecutionIdentity | undefined {
	return isExecutionIdentity(value) ? value : undefined;
}

export function withExecutionIdentity(ctx: Context, identity: ExecutionIdentity): Context {
	return ctx.setValue(IDENTITY_KEY, identity);
}

export class ExecutionIdentitySpanProcessor implements SpanProcessor {
	onStart(span: Span, parentContext: Context): void {
		const identity = toExecutionIdentity(parentContext.getValue(IDENTITY_KEY));
		if (identity) span.setAttributes(identity);
	}

	onEnd(_span: ReadableSpan): void {}

	async forceFlush(): Promise<void> {}

	async shutdown(): Promise<void> {}
}

function isExecutionIdentity(value: unknown): value is ExecutionIdentity {
	return (
		isRecord(value) &&
		typeof value[ATTR.EXECUTION_ID] === 'string' &&
		typeof value[ATTR.WORKFLOW_ID] === 'string' &&
		Object.values(value).every((entry) => typeof entry === 'string')
	);
}
