import type { ExecutionTraceLink } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import { isRecord } from '@n8n/utils/is-record';

type TraceLinkSource = {
	tracingContext?: unknown;
	startedAt?: Date | null;
	stoppedAt?: Date | null;
};

/**
 * Asks the otel module for a link to the execution's trace. Reads the module
 * through its context, so this code does not load the module.
 */
export function resolveExecutionTraceLink(
	moduleRegistry: ModuleRegistry,
	execution: TraceLinkSource,
): ExecutionTraceLink | undefined {
	const buildTraceLink = moduleRegistry.context.get('otel')?.buildTraceLink;
	if (typeof buildTraceLink !== 'function' || !execution.tracingContext) return undefined;

	const link: unknown = buildTraceLink(execution.tracingContext, {
		startedAt: execution.startedAt,
		stoppedAt: execution.stoppedAt,
	});
	return isExecutionTraceLink(link) ? link : undefined;
}

function isExecutionTraceLink(value: unknown): value is ExecutionTraceLink {
	return isRecord(value) && typeof value.traceId === 'string' && typeof value.url === 'string';
}
