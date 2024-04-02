import { Container } from 'typedi';
import type { ExecutionStatus } from 'n8n-workflow';
import { License } from '@/License';
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

export function isAdvancedExecutionFiltersEnabled(): boolean {
	const license = Container.get(License);
	return license.isAdvancedExecutionFiltersEnabled();
}

export function isDebugInEditorLicensed(): boolean {
	const license = Container.get(License);
	return license.isDebugInEditorLicensed();
}
