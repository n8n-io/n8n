import { isRecord, UserError } from '@n8n/node-sdk';

/** Keys that would change an object prototype. */
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);

/** `a.b[0].c` → `['a', 'b', '0', 'c']`, as lodash reads a field path. */
export function pathOf(field: string): string[] {
	const keys = field.replace(/\[(\d+)\]/g, '.$1').split('.');
	const reserved = keys.find((key) => RESERVED.has(key));
	if (reserved !== undefined)
		throw new UserError(`The field "${field}" uses the reserved name "${reserved}"`);
	return keys;
}

export const getPath = (value: unknown, path: readonly string[]): unknown =>
	path.reduce<unknown>(
		(node, key) => (isRecord(node) || Array.isArray(node) ? Reflect.get(node, key) : undefined),
		value,
	);

const isIndex = (key: string) => /^\d+$/.test(key);

/** A copy of `container` with `value` at `path`. Only the containers on the path are copied. */
function setIn(container: unknown, [key, ...rest]: readonly string[], value: unknown): unknown {
	if (key === undefined) return value;
	if (Array.isArray(container) && isIndex(key)) {
		const copy = [...container];
		copy[Number(key)] = setIn(container[Number(key)], rest, value);
		return copy;
	}
	const base = isRecord(container) ? container : isIndex(key) ? [] : {};
	if (Array.isArray(base)) return setIn(base, [key, ...rest], value);
	return { ...base, [key]: setIn(base[key], rest, value) };
}

export function setPath(
	target: Readonly<Record<string, unknown>>,
	path: readonly string[],
	value: unknown,
): Record<string, unknown> {
	const result = setIn(target, path, value);
	return isRecord(result) ? result : { ...target };
}

/** A copy of `target` without `path`, or `target` itself when the path does not exist. */
export function unsetPath(
	target: Readonly<Record<string, unknown>>,
	path: readonly string[],
): Readonly<Record<string, unknown>> {
	const [key, ...rest] = path;
	if (key === undefined || !(key in target)) return target;
	if (rest.length === 0) {
		const { [key]: _removed, ...kept } = target;
		return kept;
	}
	const child = target[key];
	if (!isRecord(child)) return target;
	const changed = unsetPath(child, rest);
	return changed === child ? target : { ...target, [key]: changed };
}

/** JSON with sorted object keys, so equal values give equal text. */
export const canonical = (value: unknown): string =>
	JSON.stringify(value, (_key, entry: unknown) =>
		isRecord(entry)
			? Object.fromEntries(
					Object.keys(entry)
						.sort()
						.map((name) => [name, entry[name]]),
				)
			: entry,
	) ?? 'undefined';
