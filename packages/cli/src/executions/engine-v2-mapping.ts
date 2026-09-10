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
