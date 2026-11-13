/**
 * Node descriptions from the built node packages (`dist/types/nodes.json`),
 * for the defaults of `resource`, `operation` and `authentication`, and for
 * the credential types of a node.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { JsonRecord, SampleNode } from './sample.ts';
import { isRecord, repoRoot } from './sample.ts';

interface Property {
	name: string;
	default?: unknown;
	displayOptions?: JsonRecord;
}

interface Description {
	name: string;
	versions: number[];
	properties: Property[];
	credentials: Array<{ name: string; displayOptions?: JsonRecord }>;
}

const PACKAGES: Array<[string, string]> = [
	['n8n-nodes-base', 'packages/nodes-base/dist/types/nodes.json'],
	['@n8n/n8n-nodes-langchain', 'packages/@n8n/nodes-langchain/dist/types/nodes.json'],
];

let loaded: Map<string, Description[]> | undefined;

function load(): Map<string, Description[]> {
	if (loaded) return loaded;
	loaded = new Map();
	for (const [pkg, file] of PACKAGES) {
		const list: unknown = JSON.parse(readFileSync(join(repoRoot, file), 'utf8'));
		if (!Array.isArray(list)) continue;
		for (const d of list) {
			if (!isRecord(d) || typeof d.name !== 'string') continue;
			const v = d.version;
			const versions = (Array.isArray(v) ? v : [v]).filter(
				(x): x is number => typeof x === 'number',
			);
			const properties = (Array.isArray(d.properties) ? d.properties : []).filter(
				(p): p is Property => isRecord(p) && typeof p.name === 'string',
			);
			const credentials = (Array.isArray(d.credentials) ? d.credentials : []).filter(
				(c): c is { name: string; displayOptions?: JsonRecord } =>
					isRecord(c) && typeof c.name === 'string',
			);
			const key = `${pkg}.${d.name}`;
			const entries = loaded.get(key) ?? [];
			entries.push({ name: key, versions, properties, credentials });
			loaded.set(key, entries);
		}
	}
	return loaded;
}

export function describe(type: string, version: number | undefined): Description | undefined {
	const entries = load().get(type);
	if (!entries || entries.length === 0) return undefined;
	if (version === undefined) return entries[0];
	return entries.find((e) => e.versions.includes(version)) ?? entries[0];
}

export function knownType(type: string): boolean {
	return load().has(type);
}

function conditionHolds(cond: unknown, value: unknown): boolean {
	if (isRecord(cond) && isRecord(cond._cnd)) {
		const c = cond._cnd;
		const n = typeof value === 'number' ? value : Number(value);
		if (typeof c.gte === 'number') return n >= c.gte;
		if (typeof c.lte === 'number') return n <= c.lte;
		if (typeof c.gt === 'number') return n > c.gt;
		if (typeof c.lt === 'number') return n < c.lt;
		if ('eq' in c) return c.eq === value;
		if ('not' in c) return c.not !== value;
		return true;
	}
	return cond === value;
}

/** True when the property shows for these parameters (`show` and `hide`, with `@version`). */
function shows(
	options: JsonRecord | undefined,
	params: JsonRecord,
	version: number,
	value: (name: string) => unknown,
): boolean {
	if (!options) return true;
	const read = (key: string): unknown => (key === '@version' ? version : value(key));
	const show = isRecord(options.show) ? options.show : {};
	for (const [key, list] of Object.entries(show)) {
		if (!Array.isArray(list)) continue;
		const v = read(key.replace(/^\//, ''));
		if (!list.some((c) => conditionHolds(c, v))) return false;
	}
	const hide = isRecord(options.hide) ? options.hide : {};
	for (const [key, list] of Object.entries(hide)) {
		if (!Array.isArray(list)) continue;
		const v = read(key.replace(/^\//, ''));
		if (list.some((c) => conditionHolds(c, v))) return false;
	}
	void params;
	return true;
}

/** The value of a top-level parameter: the node's own value, else the default of the property that shows. */
export function parameterValue(node: SampleNode, name: string): unknown {
	const params = node.parameters ?? {};
	if (name in params) return params[name];
	const d = describe(node.type, node.typeVersion);
	if (!d) return undefined;
	const version = node.typeVersion ?? Math.max(...d.versions, 1);
	const seen = new Set<string>();
	const value = (key: string): unknown => {
		if (key in params) return params[key];
		if (seen.has(key)) return undefined;
		seen.add(key);
		const p = d.properties.find(
			(x) => x.name === key && shows(x.displayOptions, params, version, value),
		);
		return p?.default;
	};
	return value(name);
}

/** The credential types that the node can use with its parameters (the `authentication` choice). */
export function credentialTypesOf(node: SampleNode): string[] {
	const d = describe(node.type, node.typeVersion);
	if (!d) return [];
	const version = node.typeVersion ?? Math.max(...d.versions, 1);
	return d.credentials
		.filter((c) =>
			shows(c.displayOptions, node.parameters ?? {}, version, (k) => parameterValue(node, k)),
		)
		.map((c) => c.name);
}
