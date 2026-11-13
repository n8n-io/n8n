/**
 * Identifier names for the generated source: node lists, output lists and
 * credential slots. The names come from the node and credential names, so the
 * same workflow always gives the same source.
 */

const RESERVED = new Set([
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'debugger',
	'default',
	'delete',
	'do',
	'else',
	'enum',
	'export',
	'extends',
	'false',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'new',
	'null',
	'return',
	'super',
	'switch',
	'this',
	'throw',
	'true',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',
	'let',
	'static',
	'implements',
	'interface',
	'package',
	'private',
	'protected',
	'public',
	'await',
	'async',
	'of',
	'undefined',
	'NaN',
	'Infinity',
	'arguments',
	'eval',
	// Names that the generated source and the library use.
	'ctx',
	'trigger',
	'noItems',
	'result',
	'r',
	'matched',
	'Json',
	'workflow',
	'webhook',
	'schedule',
	'i',
	'item',
	'items',
	'error',
	'e',
	'Math',
	'JSON',
	'Object',
	'Array',
	'Number',
	'String',
	'Boolean',
	'Error',
	'Date',
	'Promise',
	'parseInt',
	'parseFloat',
	'isNaN',
	// Names of the engine shape and of sub-workflow functions.
	'inputs',
	'runIndex',
	'source',
	'job',
	'out',
]);

/** camelCase identifier of a free text name, for example `HTTP Request` → `httpRequest`. */
export function camelIdentifier(text: string, fallback = 'node'): string {
	const words = text
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.split(/[^A-Za-z0-9]+/)
		.filter((w) => w.length > 0);
	if (words.length === 0) return fallback;
	const parts = words.map((w, i) => {
		const lower = w.toLowerCase();
		if (i === 0) return lower;
		return lower.charAt(0).toUpperCase() + lower.slice(1);
	});
	let id = parts.join('');
	if (/^[0-9]/.test(id)) id = `${fallback}${id}`;
	return id;
}

/** Hands out unique identifiers. */
export class NameTable {
	private readonly taken = new Set<string>(RESERVED);

	/** Reserves `base`, or `base2`, `base3`, … when it is taken. */
	unique(base: string): string {
		let name = this.taken.has(base) ? `${base}Items` : base;
		base = name;
		for (let n = 2; this.taken.has(name); n++) name = `${base}${n}`;
		this.taken.add(name);
		return name;
	}

	reserve(name: string): void {
		this.taken.add(name);
	}

	release(name: string): void {
		if (!RESERVED.has(name)) this.taken.delete(name);
	}
}

export interface CredentialUse {
	type: string;
	name: string;
}

/**
 * Gives each distinct credential (type and name) a slot name. The slot name
 * comes from the credential name. Two credentials with the same name and
 * different types get the type as a suffix. The order of the input does not
 * change the result.
 */
export function credentialSlots(uses: CredentialUse[]): Map<string, string> {
	const key = (u: CredentialUse) => `${u.type}\u0000${u.name}`;
	const distinct = new Map<string, CredentialUse>();
	for (const u of uses) distinct.set(key(u), u);
	const sorted = [...distinct.values()].sort(
		(a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type),
	);
	const byBase = new Map<string, CredentialUse[]>();
	for (const u of sorted) {
		const base = camelIdentifier(u.name || u.type, 'credential');
		byBase.set(base, [...(byBase.get(base) ?? []), u]);
	}
	const out = new Map<string, string>();
	const used = new Set<string>();
	for (const [base, list] of [...byBase.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
		for (const u of list) {
			let slot =
				list.length === 1
					? base
					: `${base}${camelIdentifier(u.type).replace(/^./, (c) => c.toUpperCase())}`;
			for (let n = 2; used.has(slot); n++) slot = `${base}${n}`;
			used.add(slot);
			out.set(key(u), slot);
		}
	}
	return out;
}

export function credentialKey(type: string, name: string): string {
	return `${type}\u0000${name}`;
}
