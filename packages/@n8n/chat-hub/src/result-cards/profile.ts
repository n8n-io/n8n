import { isPlainObject, str, truncate } from './format';
import type { FieldInfo, FieldType } from './types';

export const MAX_PROFILE_PATHS = 40;
export const MAX_SAMPLE_LENGTH = 40;
const MAX_DISTINCT = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

export function inferType(value: unknown): FieldType {
	if (value === null || value === undefined) return 'null';
	if (Array.isArray(value)) {
		if (value.length > 0 && value.every((item) => typeof item === 'number')) return 'array<number>';
		if (
			value.length > 0 &&
			value.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item))
		)
			return 'array<object>';
		return 'array<string>';
	}
	if (typeof value === 'number') return 'number';
	if (typeof value === 'boolean') return 'boolean';
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (NUMERIC_RE.test(trimmed)) return 'number';
		if (EMAIL_RE.test(trimmed)) return 'email';
		if (/^https?:\/\//i.test(trimmed)) return 'url';
		if (ISO_DATE_RE.test(trimmed)) return 'date';
		return 'string';
	}
	if (typeof value === 'object') {
		const values = Object.values(value as Record<string, unknown>);
		if (values.length > 0 && values.every((item) => typeof item === 'number'))
			return 'object<number>';
		return 'object';
	}
	return 'string';
}

export function sampleOf(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'object' && !Array.isArray(value)) {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.every(([, item]) => typeof item === 'number')) {
			return truncate(
				`{${entries.map(([key, item]) => `${key}:${String(item)}`).join(', ')}}`,
				MAX_SAMPLE_LENGTH,
			);
		}
	}
	return truncate(str(value).replace(/\s+/g, ' ').trim(), MAX_SAMPLE_LENGTH);
}

interface PathStats {
	types: Map<FieldType, number>;
	samples: Set<string>;
	sample: string;
	present: number;
}

export function profileItems(items: Array<Record<string, unknown>>): FieldInfo[] {
	// Runtime items come from arbitrary JSON; anything that is not an object has no keys to profile.
	const objects = items.filter(isPlainObject);
	const total = objects.length;
	if (total === 0) return [];

	const order: string[] = [];
	const stats = new Map<string, PathStats>();

	const visit = (path: string, value: unknown) => {
		if (!stats.has(path)) {
			if (order.length >= MAX_PROFILE_PATHS) return;
			order.push(path);
			stats.set(path, { types: new Map(), samples: new Set(), sample: '', present: 0 });
		}
		const entry = stats.get(path)!;
		entry.present += 1;
		const type = inferType(value);
		entry.types.set(type, (entry.types.get(type) ?? 0) + 1);
		const rendered = sampleOf(value);
		if (rendered && !entry.sample) entry.sample = rendered;
		if (rendered && entry.samples.size < MAX_DISTINCT) entry.samples.add(rendered);
	};

	for (const item of objects) {
		for (const [key, value] of Object.entries(item)) {
			visit(key, value);
			if (inferType(value) === 'object') {
				for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
					visit(`${key}.${childKey}`, childValue);
				}
			}
		}
	}

	return order.map((path) => {
		const entry = stats.get(path)!;
		let type: FieldType = 'null';
		let best = -1;
		for (const [candidate, count] of entry.types) {
			if (candidate !== 'null' && count > best) {
				type = candidate;
				best = count;
			}
		}
		return {
			path,
			type,
			sample: entry.sample,
			presence: Math.round((entry.present / total) * 100) / 100,
			distinct: entry.samples.size,
		};
	});
}
