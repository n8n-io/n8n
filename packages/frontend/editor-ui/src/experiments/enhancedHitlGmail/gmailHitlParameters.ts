import type { INodeProperties } from 'n8n-workflow';

export const GMAIL_HITL_PARAMETER_NAMES = new Set([
	'advancedEmail',
	'firstResponseNotice',
	'advancedEmailOptions',
	'confirmationPage',
]);

export function filterGmailHitlParameters(parameters: INodeProperties[]): INodeProperties[] {
	return parameters.filter((parameter) => !GMAIL_HITL_PARAMETER_NAMES.has(parameter.name));
}
