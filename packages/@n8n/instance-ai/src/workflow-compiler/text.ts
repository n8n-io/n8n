/** Lower-case `value` with runs of non-alphanumerics collapsed to `separator`, or `fallback` when empty. */
export function slug(value: string, fallback = 'node', separator = '-'): string {
	const edges = new RegExp(`^\\${separator}+|\\${separator}+$`, 'g');
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, separator)
			.replace(edges, '') || fallback
	);
}

/** `base`, else `base 2`, `base 3`, … until `taken` rejects none. */
export function uniqueName(base: string, taken: (name: string) => boolean, join = ' '): string {
	let name = base;
	for (let n = 2; taken(name); n += 1) name = `${base}${join}${n}`;
	return name;
}

export const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
export const lowerFirst = (value: string): string => value.charAt(0).toLowerCase() + value.slice(1);
export const capitalizeWords = (value: string): string =>
	value.replace(/\b[a-z]/g, (c) => c.toUpperCase());
