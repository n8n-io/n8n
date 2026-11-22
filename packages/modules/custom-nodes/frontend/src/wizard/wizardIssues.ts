import type { BaseTextKey } from '@n8n/i18n';

import type { LocalIssueCode, WizardStep } from './wizard.types';

/** The message of each local issue. */
export const ISSUE_MESSAGES: Record<LocalIssueCode, BaseTextKey> = {
	required: 'customNodes.wizard.issue.required',
	target_required: 'customNodes.wizard.issue.targetRequired',
	invalid_input_name: 'customNodes.wizard.issue.invalidInputName',
	invalid_number: 'customNodes.wizard.issue.invalidNumber',
	invalid_boolean: 'customNodes.wizard.issue.invalidBoolean',
	invalid_json: 'customNodes.wizard.issue.invalidJson',
	missing_key: 'customNodes.wizard.issue.missingKey',
	absolute_url_required: 'customNodes.wizard.issue.absoluteUrlRequired',
	invalid_base_url: 'customNodes.wizard.issue.invalidBaseUrl',
};

/** The step that shows the field of an issue path, such as `inputs[0].name` or `request.url`. */
export function stepOfIssue(path: string): WizardStep {
	if (path.startsWith('inputs')) return 'fields';
	if (path.startsWith('request')) return 'request';
	return 'choose';
}
