import type { IExecutionFlattedDb } from '../Interfaces';
import type { ExecutionStatus } from 'n8n-workflow';

export function getStatusUsingPreviousExecutionStatusMethod(
	execution: IExecutionFlattedDb,
): ExecutionStatus {
	if (execution.waitTill) {
		return 'waiting';
	} else if (execution.stoppedAt === undefined) {
		return 'running';
	} else if (execution.finished) {
		return 'success';
	} else if (execution.stoppedAt !== null) {
		return 'failed';
	} else {
		return 'unknown';
	}
}
