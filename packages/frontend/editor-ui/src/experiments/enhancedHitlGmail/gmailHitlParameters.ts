import type { INodeProperties } from 'n8n-workflow';

/** Advanced HITL parameters on the Gmail node, hidden when the experiment is off. */
export const GMAIL_HITL_PARAMETER_NAMES = new Set([
	'advancedEmail',
	'firstResponseNotice',
	'advancedEmailOptions',
	'confirmationPage',
]);

/** Removes the advanced HITL parameters from a Gmail node's rendered parameter list. */
export function filterGmailHitlParameters(parameters: INodeProperties[]): INodeProperties[] {
	return parameters.filter((parameter) => !GMAIL_HITL_PARAMETER_NAMES.has(parameter.name));
}
