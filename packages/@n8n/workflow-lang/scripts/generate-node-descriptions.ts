/**
 * Writes `src/generated/node-descriptions.generated.ts`: for each node type of
 * the compiled node library (`src/nodes/`), the parameter descriptions of each
 * of its versions, from the built n8n-nodes-base and
 * @n8n/n8n-nodes-langchain packages. Only what `getNodeParameters` reads is
 * kept: names, types, defaults, `displayOptions`, `multipleValues`,
 * `noDataExpression`, and the inner parameters of collections.
 *
 * Run: `node scripts/generate-node-descriptions.ts` (needs the built node packages).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NodeDescription, NodeProperty } from '../src/convert/node-parameters.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..', '..', '..');
const PACKAGES: Record<string, string> = {
	'n8n-nodes-base': join(repo, 'packages', 'nodes-base'),
	'@n8n/n8n-nodes-langchain': join(repo, 'packages', '@n8n', 'nodes-langchain'),
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The node types of the library: the `type:` of each node source. */
function libraryTypes(): string[] {
	const types = new Set<string>();
	for (const dir of ['src/nodes', 'src/nodes/declarative']) {
		for (const file of readdirSync(join(root, dir))) {
			if (!file.endsWith('.ts')) continue;
			const type = /^\ttype: '([^']+)',$/m.exec(readFileSync(join(root, dir, file), 'utf8'))?.[1];
			if (type) types.add(type);
		}
	}
	return [...types].sort();
}

/** Loads the class of a node type and gives its description for each version. */
function descriptionsOf(type: string): Map<number, Record<string, unknown>> {
	const dot = type.lastIndexOf('.');
	const pkg = type.slice(0, dot);
	const name = type.slice(dot + 1);
	const dir = PACKAGES[pkg];
	if (!dir) throw new Error(`unknown package of ${type}`);
	const known: unknown = JSON.parse(readFileSync(join(dir, 'dist/known/nodes.json'), 'utf8'));
	const entry = isRecord(known) ? known[name] : undefined;
	if (
		!isRecord(entry) ||
		typeof entry.sourcePath !== 'string' ||
		typeof entry.className !== 'string'
	) {
		throw new Error(`${type} is not in ${pkg}`);
	}
	const req = createRequire(join(dir, 'package.json'));
	const mod: unknown = req(join(dir, entry.sourcePath));
	const ctor: unknown = isRecord(mod) ? mod[entry.className] : undefined;
	if (typeof ctor !== 'function') throw new Error(`${type}: no class ${entry.className}`);
	const instance: unknown = Reflect.construct(ctor, []);
	const out = new Map<number, Record<string, unknown>>();
	const add = (description: unknown) => {
		if (!isRecord(description)) return;
		const v = description.version;
		const versions = Array.isArray(v) ? v : [v ?? 1];
		for (const version of versions) if (typeof version === 'number') out.set(version, description);
	};
	if (isRecord(instance) && isRecord(instance.nodeVersions)) {
		for (const [version, node] of Object.entries(instance.nodeVersions)) {
			if (!isRecord(node) || !isRecord(node.description)) continue;
			out.set(Number(version), node.description);
		}
	} else if (isRecord(instance)) {
		add(instance.description);
	}
	return out;
}

/** The members of one parameter that `getNodeParameters` reads. */
function slim(p: unknown): NodeProperty | undefined {
	if (!isRecord(p) || typeof p.name !== 'string') return undefined;
	const out: NodeProperty = { name: p.name };
	if (typeof p.type === 'string') out.type = p.type;
	if (p.default !== undefined) out.default = p.default;
	if (isRecord(p.displayOptions)) {
		const d: NodeProperty['displayOptions'] = {};
		for (const key of ['show', 'hide'] as const) {
			const rule = p.displayOptions[key];
			if (isRecord(rule)) {
				const r: Record<string, unknown[]> = {};
				for (const [k, v] of Object.entries(rule)) if (Array.isArray(v)) r[k] = v;
				d[key] = r;
			}
		}
		out.displayOptions = d;
	}
	if (isRecord(p.typeOptions) && typeof p.typeOptions.multipleValues === 'boolean') {
		out.typeOptions = { multipleValues: p.typeOptions.multipleValues };
	}
	if (p.noDataExpression === true) out.noDataExpression = true;
	if ((p.type === 'collection' || p.type === 'fixedCollection') && Array.isArray(p.options)) {
		out.options = p.options.map(slim).filter((x): x is NodeProperty => x !== undefined);
	}
	// An option of a fixed collection: its parameters.
	if (Array.isArray(p.values)) {
		out.values = p.values.map(slim).filter((x): x is NodeProperty => x !== undefined);
	}
	return out;
}

/** The version conditions of the node features (`@feature` in displayOptions). */
function featuresOf(features: Record<string, unknown>): NonNullable<NodeDescription['features']> {
	const out: NonNullable<NodeDescription['features']> = {};
	for (const [name, condition] of Object.entries(features)) {
		const v = isRecord(condition) ? condition['@version'] : undefined;
		out[name] = Array.isArray(v) ? { '@version': v } : {};
	}
	return out;
}

const descriptions: Record<string, NodeDescription> = {};
const versions: Record<string, string> = {};
const byText = new Map<string, string>();
for (const type of libraryTypes()) {
	for (const [version, description] of descriptionsOf(type)) {
		const slimmed: NodeDescription = {
			name: typeof description.name === 'string' ? description.name : type,
			...(isRecord(description.features) ? { features: featuresOf(description.features) } : {}),
			properties: (Array.isArray(description.properties) ? description.properties : [])
				.map(slim)
				.filter((x): x is NodeProperty => x !== undefined),
		};
		const text = JSON.stringify(slimmed);
		let key = byText.get(text);
		if (key === undefined) {
			key = `d${byText.size}`;
			byText.set(text, key);
			descriptions[key] = slimmed;
		}
		versions[`${type}@${version}`] = key;
	}
}

writeFileSync(
	join(root, 'src/generated/node-descriptions.generated.ts'),
	[
		'// Generated by scripts/generate-node-descriptions.ts. Do not edit.',
		"import type { NodeDescription } from '../convert/node-parameters.ts';",
		'',
		'/** The parameter descriptions of the library node types, by key. */',
		`export const NODE_DESCRIPTIONS: Record<string, NodeDescription> = ${JSON.stringify(descriptions)};`,
		'',
		'/** The key of the description of each `type@version`. */',
		`export const NODE_DESCRIPTION_VERSIONS: Record<string, string> = ${JSON.stringify(versions)};`,
		'',
	].join('\n'),
);
console.log(`${Object.keys(versions).length} type versions, ${byText.size} descriptions`);
