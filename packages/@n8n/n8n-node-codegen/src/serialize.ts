type Style = 'ts' | 'json';

const TAB_WIDTH = 4;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const entriesOf = (value: Record<string, unknown>) =>
	Object.entries(value).filter(([, v]) => v !== undefined);

function quote(value: string, style: Style) {
	if (style === 'json') return JSON.stringify(value);
	return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

const keyOf = (key: string, style: Style) =>
	style === 'ts' && IDENTIFIER.test(key) ? key : quote(key, style);

function inline(value: unknown, style: Style): string {
	if (typeof value === 'string') return quote(value, style);
	if (Array.isArray(value))
		return value.length ? `[${value.map((v) => inline(v, style)).join(', ')}]` : '[]';
	if (isObject(value)) {
		const entries = entriesOf(value);
		if (!entries.length) return '{}';
		return `{ ${entries.map(([k, v]) => `${keyOf(k, style)}: ${inline(v, style)}`).join(', ')} }`;
	}
	return JSON.stringify(value) ?? 'null';
}

export function serialize(
	value: unknown,
	style: Style,
	maxWidth: number,
	depth = 0,
	prefixWidth = 0,
): string {
	const flat = inline(value, style);
	const fits = depth * TAB_WIDTH + prefixWidth + flat.length + 1 <= maxWidth;
	if (fits || !(Array.isArray(value) || isObject(value))) return flat;

	const indent = '\t'.repeat(depth + 1);
	const items = Array.isArray(value)
		? value.map((v) => serialize(v, style, maxWidth, depth + 1))
		: entriesOf(value).map(([k, v]) => {
				const key = `${keyOf(k, style)}: `;
				return `${key}${serialize(v, style, maxWidth, depth + 1, key.length)}`;
			});
	const lines = items.map(
		(item, i) => `${indent}${item}${style === 'ts' || i < items.length - 1 ? ',' : ''}`,
	);
	const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
	return `${open}\n${lines.join('\n')}\n${'\t'.repeat(depth)}${close}`;
}
