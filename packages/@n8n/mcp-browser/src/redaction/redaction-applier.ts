import type { CallToolResult } from '../types';
import { createRedactionMarkerFormatter, replaceLiteral } from './redact';
import type { SensitivityOk } from '../sensitivity/analyze-html';

function redactText(
	input: string,
	result: SensitivityOk,
	marker: ReturnType<typeof createRedactionMarkerFormatter>,
): string {
	let output = input;
	for (const hit of result.hits) {
		output = replaceLiteral(output, hit.value, marker(hit));
	}
	return output;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false;
	return Object.getPrototypeOf(value) === Object.prototype;
}

function redactValue(
	value: unknown,
	result: SensitivityOk,
	marker: ReturnType<typeof createRedactionMarkerFormatter>,
): unknown {
	if (typeof value === 'string') return redactText(value, result, marker);
	if (Array.isArray(value)) return value.map((entry) => redactValue(entry, result, marker));
	if (isPlainObject(value)) {
		const out: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value)) {
			out[key] = redactValue(entry, result, marker);
		}
		return out;
	}
	return value;
}

export function applyRedactions(
	result: CallToolResult,
	sensitivity: SensitivityOk,
): CallToolResult {
	const marker = createRedactionMarkerFormatter(sensitivity.hits);

	if (result.structuredContent !== undefined) {
		const redacted = redactValue(result.structuredContent, sensitivity, marker);
		if (isPlainObject(redacted)) result.structuredContent = redacted;
	}

	for (const item of result.content) {
		if (item.type === 'text' && typeof item.text === 'string') {
			item.text = redactText(item.text, sensitivity, marker);
		}
	}

	return result;
}
