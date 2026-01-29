import { UserError } from 'n8n-workflow';

export class TriggerParameterConflictError extends UserError {
	constructor(
		triggerType: string,
		parameterName: string,
		parameterValue: string,
		conflictingWorkflowName: string,
	) {
		const triggerDisplayName = triggerType.replace('n8n-nodes-base.', '');

		super(
			`The ${triggerDisplayName} parameter "${parameterName}" with value "${parameterValue}" is already in use by the active workflow "${conflictingWorkflowName}". Each ${triggerDisplayName} must use a different "${parameterName}" to avoid conflicts.`,
			{ extra: { triggerType, parameterName, parameterValue, conflictingWorkflowName } },
		);
	}
}
