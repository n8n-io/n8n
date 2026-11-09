/**
 * Hand-written Placeholder Validator
 *
 * Flags literal strings such as `PLACEHOLDER_CALENDAR_ID` or `<your sheet id>`.
 * Setup asks the user only for `placeholder()` values, so a literal string is
 * never offered for input, and the node fails at run time.
 */

import { isPlaceholderValue } from '../../string-utils';
import { isPlainObject } from '../../../utils/safe-access';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

/** `PLACEHOLDER_CALENDAR_ID`, `your-sheet-id`, `insert_api_key`. */
const WORD_FORM = /^(?:placeholder|your|insert|enter)[_-][a-z0-9_-]+$/i;

/** Only `REPLACE_ME` for `replace`: real option values such as `replace_content` share the prefix. */
const REPLACE_ME = /^replace[_-]me$/i;

/** `<your calendar id>`, `[YOUR_SHEET]`, `{insert value}`. */
const BRACKET_FORM =
	/^[<[{]\s*(?:your|insert|enter|replace|placeholder)(?:\b|_)[^<>[\]{}]*[>\]}]$/i;

/**
 * Keys whose value is text for a person, not a value the node uses. A resource
 * locator's cached name and URL are display labels next to its real `value`.
 * `description` is left out: some nodes use it as a real input.
 */
const HINT_KEYS = new Set(['placeholder', 'notice', 'hint', 'cachedResultName', 'cachedResultUrl']);

export function isHandWrittenPlaceholder(value: string): boolean {
	const trimmed = value.trim();
	if (trimmed.startsWith('=') || isPlaceholderValue(trimmed)) return false;
	return WORD_FORM.test(trimmed) || REPLACE_ME.test(trimmed) || BRACKET_FORM.test(trimmed);
}

function findHandWrittenPlaceholders(
	value: unknown,
	path: string,
	out: Array<{ path: string; value: string }>,
): void {
	if (typeof value === 'string') {
		if (isHandWrittenPlaceholder(value)) out.push({ path, value });
	} else if (Array.isArray(value)) {
		value.forEach((entry, index) => findHandWrittenPlaceholders(entry, `${path}[${index}]`, out));
	} else if (isPlainObject(value)) {
		for (const [key, entry] of Object.entries(value)) {
			if (HINT_KEYS.has(key)) continue;
			findHandWrittenPlaceholders(entry, path ? `${path}.${key}` : key, out);
		}
	}
}

export const handWrittenPlaceholderValidator: ValidatorPlugin = {
	id: 'core:hand-written-placeholder',
	name: 'Hand-written Placeholder Validator',
	priority: 40,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		// A disabled node does not run, so its values cannot fail.
		if (node.config?.disabled) return [];
		const found: Array<{ path: string; value: string }> = [];
		findHandWrittenPlaceholders(node.config?.parameters, '', found);
		return found.map(({ path, value }) => ({
			code: 'HAND_WRITTEN_PLACEHOLDER',
			message:
				`'${node.name}' parameter '${path}' has the hand-written placeholder "${value}". ` +
				"Setup does not ask the user for it, so the node fails at run time. Use placeholder('hint') " +
				'(for a resource locator, as its `value`), or the real value if the user gave one.',
			// A save with this value cannot work, and the fix is one edit.
			severity: 'warning',
			violationLevel: 'major',
			nodeName: node.name,
			parameterPath: path,
		}));
	},
};
