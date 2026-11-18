import escapeRegExp from 'lodash/escapeRegExp';

/**
 * The id of the first workflow that a text links to on this instance, or
 * `undefined`. Only a link that starts with the base URL of the instance counts.
 * The caller still checks that the user can read the workflow.
 */
export function findWorkflowIdInText(text: string, instanceBaseUrl: string): string | undefined {
	const base = instanceBaseUrl.replace(/\/+$/, '');
	if (!base) return undefined;
	const pattern = new RegExp(
		`${escapeRegExp(base)}/workflow/([A-Za-z0-9_-]{1,36})(?![A-Za-z0-9_-])`,
	);
	return pattern.exec(text)?.[1];
}
