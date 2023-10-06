import type { IWorkflowSettings } from 'n8n-workflow';

export type DefaultSaveSettings = Pick<
	IWorkflowSettings,
	NonNullable<'saveDataErrorExecution' | 'saveManualExecutions' | 'saveDataSuccessExecution'>
>;

/**
 * Return whether a workflow execution is configured to be saved or not,
 * for error executions, success executions, and manual executions.
 */
export function toSaveSettings(
	defaults: DefaultSaveSettings,
	workflowSettings: IWorkflowSettings = {},
) {
	return {
		error:
			workflowSettings.saveDataErrorExecution !== 'none' ??
			defaults.saveDataErrorExecution !== 'none',
		success:
			workflowSettings.saveDataSuccessExecution !== 'none' ??
			defaults.saveDataSuccessExecution !== 'none',
		manual: workflowSettings?.saveManualExecutions ?? defaults.saveManualExecutions,
	};
}
