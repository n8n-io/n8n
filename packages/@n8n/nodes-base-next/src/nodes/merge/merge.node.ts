import { defineNode, isRecord } from '@n8n/node-sdk';

/** Joins two item streams. Each action has the inputs left and right, in this order. */
export const merge = defineNode({ id: 'merge', displayName: 'Merge' });

export const INPUTS = ['left', 'right'] as const;

/**
 * `source` merged into `target` at every depth, as lodash `merge` does: objects by key,
 * lists by index, and an undefined value keeps the target value. The result shares no object
 * with the inputs, so a later node that changes it cannot change an input item.
 */
export function mergeDeep(target: unknown, source: unknown): unknown {
	if (source === undefined) return copyOf(target);
	if (isRecord(source)) {
		const base = isRecord(target) ? target : {};
		const keys = [...new Set([...Object.keys(base), ...Object.keys(source)])];
		return Object.fromEntries(keys.map((key) => [key, mergeDeep(base[key], source[key])]));
	}
	if (Array.isArray(source)) {
		const base: readonly unknown[] = Array.isArray(target) ? target : [];
		const length = Math.max(base.length, source.length);
		return Array.from({ length }, (_, index) => mergeDeep(base[index], source[index]));
	}
	return source;
}

const copyOf = (value: unknown): unknown =>
	isRecord(value) || Array.isArray(value) ? mergeDeep(undefined, value) : value;

export const mergeJson = (
	...values: ReadonlyArray<Readonly<Record<string, unknown>>>
): Record<string, unknown> => {
	const merged = values.reduce<unknown>((result, value) => mergeDeep(result, value), {});
	return isRecord(merged) ? merged : {};
};
