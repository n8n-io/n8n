import type { IWorkflowSettings } from 'n8n-workflow';

import config from '@/config';

/**
 * Return whether a workflow execution is configured to be saved or not:
 *
 * - `error`: Whether to save failed executions in production.
 * - `success`: Whether to successful executions in production.
 * - `manual`: Whether to save successful or failed manual executions.
 * - `progress`: Whether to save execution progress, i.e. after each node's execution.
 */
export function toSaveSettings(workflowSettings: IWorkflowSettings = {}) {
	const DEFAULTS = {
		ERROR: config.getEnv('executions.saveDataOnError'),
		SUCCESS: config.getEnv('executions.saveDataOnSuccess'),
		MANUAL: config.getEnv('executions.saveDataManualExecutions'),
		PROGRESS: config.getEnv('executions.saveExecutionProgress'),
	};

	return {
		error: workflowSettings.saveDataErrorExecution
			? workflowSettings.saveDataErrorExecution !== 'none'
			: DEFAULTS.ERROR !== 'none',
		success: workflowSettings.saveDataSuccessExecution
			? workflowSettings.saveDataSuccessExecution !== 'none'
			: DEFAULTS.SUCCESS !== 'none',
		manual:
			workflowSettings === undefined || workflowSettings.saveManualExecutions === 'DEFAULT'
				? DEFAULTS.MANUAL
				: (workflowSettings.saveManualExecutions ?? DEFAULTS.MANUAL),
		progress:
			workflowSettings === undefined || workflowSettings.saveExecutionProgress === 'DEFAULT'
				? DEFAULTS.PROGRESS
				: (workflowSettings.saveExecutionProgress ?? DEFAULTS.PROGRESS),
	};
}
