import type { CallToolResult } from '../types';
import {
	applyReplacements,
	buildReplacements,
	createRedactionMarkerFormatter,
	replaceInValue,
} from './redact';
import type { SensitivityOk } from '../sensitivity/analyze-html';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false;
	return Object.getPrototypeOf(value) === Object.prototype;
}

export function applyRedactions(
	result: CallToolResult,
	sensitivity: SensitivityOk,
): CallToolResult {
	const replacements = buildReplacements(
		sensitivity.hits,
		createRedactionMarkerFormatter(sensitivity.hits),
	);

	if (result.structuredContent !== undefined) {
		const redacted = replaceInValue(result.structuredContent, replacements);
		if (isPlainObject(redacted)) result.structuredContent = redacted;
	}

	for (const item of result.content) {
		if (item.type === 'text' && typeof item.text === 'string') {
			item.text = applyReplacements(item.text, replacements);
		}
	}

	return result;
}
