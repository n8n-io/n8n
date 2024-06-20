import type { ExecutionStatus } from 'n8n-workflow';
import type { IExecutionFlattedDb, IExecutionResponse } from '@/Interfaces';

export function getStatusUsingPreviousExecutionStatusMethod(
	execution: IExecutionFlattedDb | IExecutionResponse,
): ExecutionStatus {
	if (execution.waitTill) {
		return 'waiting';
	} else if (execution.stoppedAt === undefined) {
		return 'running';
	} else if (execution.finished) {
		return 'success';
	} else if (execution.stoppedAt !== null) {
		return 'error';
	} else {
		return 'unknown';
	}
}
