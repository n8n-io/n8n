import { isRecord } from '@n8n/utils/is-record';
import { isPlaceholderValue } from '@n8n/utils/placeholder';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ValidationWarning } from './workflow-validation-warnings';

export const FAKE_PLACEHOLDER_VALUE_CODE = 'FAKE_PLACEHOLDER_VALUE';

// `PLACEHOLDER_CALENDAR_ID`, `your-sheet-id`, `REPLACE_ME`, `insert_api_key`.
const WORD_FORM = /^(?:placeholder|your|insert|enter)[_-][a-z0-9_-]+$/i;
// Only `REPLACE_ME` for `replace`: real option values such as `replace_content` share the prefix.
const REPLACE_ME = /^replace[_-]me$/i;
// `<your calendar id>`, `[YOUR_SHEET]`, `{insert value}`.
const BRACKET_FORM =
	/^[<[{]\s*(?:your|insert|enter|replace|placeholder)(?:\b|_)[^<>[\]{}]*[>\]}]$/i;

/** Parameter keys whose value is UI hint text, not a value the node uses. */
const HINT_KEYS = new Set(['placeholder', 'notice', 'hint', 'description']);

function looksLikeFakePlaceholder(value: string): boolean {
	const trimmed = value.trim();
	if (trimmed.startsWith('=') || isPlaceholderValue(trimmed)) return false;
	return WORD_FORM.test(trimmed) || REPLACE_ME.test(trimmed) || BRACKET_FORM.test(trimmed);
}

function collect(value: unknown, path: string, out: Array<{ path: string; value: string }>): void {
	if (typeof value === 'string') {
		if (looksLikeFakePlaceholder(value)) out.push({ path, value });
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((child, index) => collect(child, `${path}[${index}]`, out));
		return;
	}
	if (!isRecord(value)) return;
	for (const [key, child] of Object.entries(value)) {
		if (HINT_KEYS.has(key)) continue;
		collect(child, path ? `${path}.${key}` : key, out);
	}
}

/**
 * Flags hand-written placeholder strings such as `PLACEHOLDER_CALENDAR_ID`.
 * Setup only detects `placeholder()` values, so a literal string is never
 * offered to the user and the workflow fails at run time (n8n rejects it as
 * an invalid ID, or calls the service with it).
 *
 * Blocking: the fix is one edit in the source file, and the saved workflow
 * cannot work without it.
 */
export function detectFakePlaceholderValues(json: WorkflowJSON): ValidationWarning[] {
	const warnings: ValidationWarning[] = [];
	for (const node of json.nodes ?? []) {
		if (node.disabled || !isRecord(node.parameters)) continue;
		const nodeName = typeof node.name === 'string' ? node.name : undefined;
		const found: Array<{ path: string; value: string }> = [];
		collect(node.parameters, '', found);
		for (const { path, value } of found) {
			warnings.push({
				code: FAKE_PLACEHOLDER_VALUE_CODE,
				message:
					`"${value}" at ${path} is a hand-written placeholder. Setup does not detect it, so the ` +
					"user is never asked for the value and the node fails at run time. Use placeholder('hint') " +
					'as the value (for a resource locator, as its `value`), or the real value if the user gave one.',
				nodeName,
				parameterPath: path,
				severity: 'error',
			});
		}
	}
	return warnings;
}
