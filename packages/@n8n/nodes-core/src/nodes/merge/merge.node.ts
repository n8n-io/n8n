import { defineNode, isRecord, t } from '@n8n/node-sdk';

/** Joins item streams: 2 to 10 counted inputs, or the inputs left and right of `combine`. */
export const merge = defineNode({ id: 'merge', displayName: 'Merge' });

export const INPUTS = ['left', 'right'] as const;

/** The number of inputs of an action with counted inputs, as the legacy Merge node allows. */
export const INPUT_COUNT = t
	.int()
	.with({ minimum: 2, maximum: 10 })
	.default(2)
	.hint('Number of inputs, from 2 to 10');

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
