import { Container } from 'typedi';
import type { IExecutionFlattedDb } from '@/Interfaces';
import type { ExecutionStatus } from 'n8n-workflow';
import { License } from '@/License';

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

export function isAdvancedExecutionFiltersEnabled(): boolean {
	const license = Container.get(License);
	return license.isAdvancedExecutionFiltersEnabled();
}
