import type { ExecutionMode, ExecutionStatus } from '@n8n/engine';
import type { ExecutionStatus as ExecutionStatusV1, WorkflowExecuteMode } from 'n8n-workflow';

/** A status added later reads as `unknown` rather than being guessed at. */
const V1_STATUS_BY_V2_STATUS = new Map<ExecutionStatus, ExecutionStatusV1>([
	['queued', 'new'],
	['running', 'running'],
	['completed', 'success'],
	['failed', 'error'],
	['cancelled', 'canceled'],
]);

/** Anything not manual is a production run. */
const V1_MODE_BY_V2_MODE = new Map<ExecutionMode, WorkflowExecuteMode>([
	['manual', 'manual'],
	['production', 'trigger'],
]);

export function toV1Status(status: ExecutionStatus): ExecutionStatusV1 {
	return V1_STATUS_BY_V2_STATUS.get(status) ?? 'unknown';
}

export function toV1Mode(mode: ExecutionMode): WorkflowExecuteMode {
	return V1_MODE_BY_V2_MODE.get(mode) ?? 'trigger';
}

/**
 * The v2 status codes that map onto one of `v1Statuses`, or `undefined` when no
 * filter is given. An unfiltered list must not be narrowed to the mapped
 * statuses, or a status the data plane adds later never shows up.
 */
export function resolveV2Statuses(v1Statuses?: ExecutionStatusV1[]): ExecutionStatus[] | undefined {
	if (!v1Statuses?.length) return undefined;

	return [...V1_STATUS_BY_V2_STATUS.entries()]
		.filter(([, v1]) => v1Statuses.includes(v1))
		.map(([v2]) => v2);
}
