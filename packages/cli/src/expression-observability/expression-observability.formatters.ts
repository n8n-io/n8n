import type { Attributes } from '@opentelemetry/api';

const MAX_EXPRESSION_TEXT_LENGTH = 256;

export function toPromName(
	name: string,
	kind: 'counter' | 'gauge' | 'histogram',
	prefix: string,
): string {
	const base = prefix + name.replace(/\./g, '_');
	return kind === 'counter' && !base.endsWith('_total') ? base + '_total' : base;
}

export function normalizeAttributes(attributes?: Record<string, unknown>): Attributes | undefined {
	if (!attributes) return undefined;
	const entries = Object.entries(attributes);
	if (entries.length === 0) return undefined;
	const result: Attributes = {};
	for (const [key, value] of entries) {
		const normalized = normalizeAttributeValue(value);
		if (normalized !== undefined) result[key] = normalized;
	}
	return result;
}

export function normalizeAttributeValue(value: unknown): Attributes[string] | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'string')
		return value.length > MAX_EXPRESSION_TEXT_LENGTH
			? value.slice(0, MAX_EXPRESSION_TEXT_LENGTH)
			: value;
	if (typeof value === 'number' || typeof value === 'boolean') return value;
	return String(value);
}
