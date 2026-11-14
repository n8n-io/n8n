import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IWorkflowSettings, WorkflowExecuteMode } from 'n8n-workflow';

export type ExecutionSaveSettings = {
	error: boolean | 'all' | 'none';
	success: boolean | 'all' | 'none';
	manual: boolean;
	progress: boolean;
};

/**
 * Return whether a workflow execution is configured to be saved or not:
 *
 * - `error`: Whether to save failed executions in production.
 * - `success`: Whether to save successful executions in production. Always true for retries.
 * - `manual`: Whether to save successful or failed manual executions.
 * - `progress`: Whether to save execution progress, i.e. after each node's execution.
 */
export function toSaveSettings(
	workflowSettings: IWorkflowSettings | null = {},
	mode?: WorkflowExecuteMode,
): ExecutionSaveSettings {
	const DEFAULTS = {
		ERROR: Container.get(GlobalConfig).executions.saveDataOnError,
		SUCCESS: Container.get(GlobalConfig).executions.saveDataOnSuccess,
		MANUAL: Container.get(GlobalConfig).executions.saveDataManualExecutions,
		PROGRESS: Container.get(GlobalConfig).executions.saveExecutionProgress,
	};

	const {
		saveDataErrorExecution = DEFAULTS.ERROR,
		saveDataSuccessExecution = DEFAULTS.SUCCESS,
		saveManualExecutions = DEFAULTS.MANUAL,
		saveExecutionProgress = DEFAULTS.PROGRESS,
	} = workflowSettings ?? {};

	return {
		error: saveDataErrorExecution === 'DEFAULT' ? DEFAULTS.ERROR : saveDataErrorExecution === 'all',
		// Keep successful retries so the original execution can link to a stored result.
		success:
			mode === 'retry' ||
			(saveDataSuccessExecution === 'DEFAULT'
				? DEFAULTS.SUCCESS
				: saveDataSuccessExecution === 'all'),
		manual: saveManualExecutions === 'DEFAULT' ? DEFAULTS.MANUAL : saveManualExecutions,
		progress: saveExecutionProgress === 'DEFAULT' ? DEFAULTS.PROGRESS : saveExecutionProgress,
	};
}
