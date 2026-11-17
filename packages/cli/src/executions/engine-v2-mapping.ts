import type { ExecutionStatus, ParentLink } from '@n8n/engine';
import assert from 'node:assert';
import {
	WorkflowExecuteModeList,
	type ExecutionStatus as ExecutionStatusV1,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

/** A status added later reads as `unknown` rather than being guessed at. */
const V1_STATUS_BY_V2_STATUS = new Map<ExecutionStatus, ExecutionStatusV1>([
	['queued', 'new'],
	['running', 'running'],
	['waiting', 'waiting'],
	['completed', 'success'],
	['failed', 'error'],
	['cancelled', 'canceled'],
]);

const V1_MODE_BY_REPORTED_MODE = new Map<string, WorkflowExecuteMode>(
	WorkflowExecuteModeList.map((mode) => [mode, mode]),
);

export function toV1Status(status: ExecutionStatus): ExecutionStatusV1 {
	return V1_STATUS_BY_V2_STATUS.get(status) ?? 'unknown';
}

/**
 * A sub-execution inherits the host mode of its parent, because the engine
 * copies the caller context when it starts one. v1 runs every sub-execution as
 * `integrated`, so a parent link decides the mode before the host mode does.
 */
export function toV1Mode(execution: {
	hostMode: string;
	parent: ParentLink | null;
}): WorkflowExecuteMode {
	if (execution.parent) return 'integrated';

	const v1Mode = V1_MODE_BY_REPORTED_MODE.get(execution.hostMode);
	assert(v1Mode, `Unknown v1 mode ${execution.hostMode}`);
	return v1Mode;
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
