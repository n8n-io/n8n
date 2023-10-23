import config from '@/config';
import type { IWorkflowSettings } from 'n8n-workflow';

const DEFAULTS = {
	ERROR: config.getEnv('executions.saveDataOnError'),
	SUCCESS: config.getEnv('executions.saveDataOnSuccess'),
	MANUAL: config.getEnv('executions.saveDataManualExecutions'),
};

/**
 * Return whether a workflow execution is configured to be saved or not,
 * for error executions, success executions, and manual executions.
 */
export function toSaveSettings(workflowSettings: IWorkflowSettings = {}) {
	return {
		error: workflowSettings.saveDataErrorExecution !== 'none' ?? DEFAULTS.ERROR !== 'none',
		success: workflowSettings.saveDataSuccessExecution !== 'none' ?? DEFAULTS.SUCCESS !== 'none',
		manual: workflowSettings?.saveManualExecutions ?? DEFAULTS.MANUAL,
	};
}
