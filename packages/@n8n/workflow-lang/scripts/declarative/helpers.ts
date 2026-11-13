/**
 * Helper functions in the workflow subset that generated library nodes use.
 * The translator copies each helper that a node needs into the node file:
 * a library file can import only from `@n8n/workflow-lang`.
 *
 * Each helper follows the n8n or lodash function that it replaces.
 */

const HEX = '0123456789ABCDEF';

export const HELPERS: Record<string, { deps: string[]; code: string }> = {
	str: {
		deps: [],
		code: `/** A template part, as n8n renders it: falsy values other than 0 are empty, objects are JSON. */
function str(value: unknown): string {
	if (value === undefined || value === null || value === false || value === '') return '';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}`,
	},
	percentEncode: {
		deps: [],
		code: `/** Percent-encodes a string as UTF-8. Characters in \`keep\` stay as they are. */
function percentEncode(text: string, keep: string): string {
	const hex = '${HEX}';
	let out = '';
	for (let i = 0; i < text.length; i++) {
		const ch = text.charAt(i);
		let code = text.charCodeAt(i);
		if (keep.includes(ch)) {
			out += ch;
			continue;
		}
		if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
			const low = text.charCodeAt(i + 1);
			if (low >= 0xdc00 && low <= 0xdfff) {
				code = 0x10000 + (code - 0xd800) * 0x400 + (low - 0xdc00);
				i++;
			}
		}
		const bytes: number[] = [];
		if (code < 0x80) bytes.push(code);
		else if (code < 0x800) bytes.push(0xc0 + Math.floor(code / 64), 0x80 + (code % 64));
		else if (code < 0x10000) {
			bytes.push(0xe0 + Math.floor(code / 4096), 0x80 + (Math.floor(code / 64) % 64), 0x80 + (code % 64));
		} else {
			bytes.push(
				0xf0 + Math.floor(code / 262144),
				0x80 + (Math.floor(code / 4096) % 64),
				0x80 + (Math.floor(code / 64) % 64),
				0x80 + (code % 64),
			);
		}
		for (const b of bytes) out += '%' + hex.charAt(Math.floor(b / 16)) + hex.charAt(b % 16);
	}
	return out;
}`,
	},
	encodeComponent: {
		deps: ['percentEncode'],
		code: `/** encodeURIComponent. */
function encodeComponent(value: unknown): string {
	return percentEncode(String(value), "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()");
}`,
	},
	encodeUri: {
		deps: ['percentEncode'],
		code: `/** encodeURI. */
function encodeUri(value: unknown): string {
	return percentEncode(
		String(value),
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'();/?:@&=+$,#",
	);
}`,
	},
	toPathSegment: {
		deps: ['encodeComponent'],
		code: `/** toPathSegment of n8n-workflow: one encoded URL path segment. */
function toPathSegment(id: unknown): string {
	if (id === null || id === undefined) throw new Error('Invalid identifier: a value is required');
	const value = String(id);
	if (value === '' || value === '.' || value === '..') {
		throw new Error(\`Invalid identifier: "\${value}" is not allowed\`);
	}
	return encodeComponent(value);
}`,
	},
	pathSegments: {
		deps: [],
		code: `/** Splits a lodash property path such as \`a.b[0].c\`. Index segments become numbers. */
function pathSegments(path: string): Array<string | number> {
	const out: Array<string | number> = [];
	for (const part of path.split('.')) {
		const open = part.indexOf('[');
		if (open < 0) {
			out.push(part);
			continue;
		}
		if (open > 0) out.push(part.slice(0, open));
		for (const index of part.slice(open + 1, part.length - 1).split('][')) {
			const n = Number(index);
			out.push(Number.isInteger(n) && index !== '' ? n : index);
		}
	}
	return out;
}`,
	},
	setPath: {
		deps: ['pathSegments'],
		code: `/** lodash \`set\`: creates objects, or arrays before an index segment. */
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
	const segments = pathSegments(path);
	let current: Record<string, unknown> = target;
	for (let i = 0; i < segments.length - 1; i++) {
		const key = segments[i];
		let next = current[key];
		if (typeof next !== 'object' || next === null) {
			next = typeof segments[i + 1] === 'number' ? [] : {};
			current[key] = next;
		}
		current = next as Record<string, unknown>;
	}
	current[segments[segments.length - 1]] = value;
}`,
	},
	getPath: {
		deps: ['pathSegments'],
		code: `/** lodash \`get\`. */
function getPath(source: unknown, path: string): unknown {
	let current: unknown = source;
	for (const key of pathSegments(path)) {
		if (typeof current !== 'object' || current === null) return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}`,
	},
	merge: {
		deps: [],
		code: `/** lodash \`merge\` of plain JSON values: objects and arrays merge by key, undefined does not overwrite. */
function merge(target: Record<string, unknown>, source: unknown): Record<string, unknown> {
	if (typeof source !== 'object' || source === null) return target;
	for (const key of Object.keys(source)) {
		const value = (source as Record<string, unknown>)[key];
		if (value === undefined) continue;
		const current = target[key];
		if (typeof value === 'object' && value !== null) {
			const base =
				typeof current === 'object' && current !== null && Array.isArray(current) === Array.isArray(value)
					? current
					: Array.isArray(value)
						? []
						: {};
			target[key] = merge(base as Record<string, unknown>, value);
		} else {
			target[key] = value;
		}
	}
	return target;
}`,
	},
	rlValue: {
		deps: [],
		code: `/** The value of a resource locator parameter. Modes in \`unsupported\` extract the value with a regular expression. */
function rlValue(value: unknown, unsupported: string[]): unknown {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
	const locator = value as Record<string, unknown>;
	if (typeof locator.mode === 'string' && unsupported.includes(locator.mode)) {
		throw new Error(\`The resource locator mode "\${locator.mode}" is not in the compiled library. Use mode "id".\`);
	}
	return locator.value;
}`,
	},
	joinUrl: {
		deps: [],
		code: `/** Joins a base URL and a URL as axios does. An absolute URL wins. */
function joinUrl(base: string | undefined, url: string | undefined): string {
	const path = url ?? '';
	if (path.startsWith('http://') || path.startsWith('https://') || base === undefined || base === '') {
		return path;
	}
	if (path === '') return base;
	let left = base;
	while (left.endsWith('/')) left = left.slice(0, -1);
	let right = path;
	while (right.startsWith('/')) right = right.slice(1);
	return left + '/' + right;
}`,
	},
};

/** The helpers that `names` need, in dependency order. */
export function helperCode(names: Iterable<string>): string[] {
	const ordered: string[] = [];
	const visit = (name: string) => {
		if (ordered.includes(name)) return;
		const helper = HELPERS[name];
		if (!helper) throw new Error(`unknown helper ${name}`);
		for (const dep of helper.deps) visit(dep);
		ordered.push(name);
	};
	for (const name of [...names].sort()) visit(name);
	return ordered.map((name) => HELPERS[name].code);
}
