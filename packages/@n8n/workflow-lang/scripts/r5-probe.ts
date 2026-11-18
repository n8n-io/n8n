import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { publicCredential } from '../src/credentials/public.ts';
import { loadCredentialTypes, registryOf } from '../src/credentials/types.ts';
import { compileForCheck } from '../src/node-compile/__tests__/verify.ts';
import type { ErrorMode, NodeSources } from '../src/node-compile/convert.ts';
import { evaluateInSandbox } from '../src/node-compile/evaluate-node.ts';
import type { Json, WalkNode } from '../src/node-compile/walk.ts';
import {
	credentialOf,
	fakeCredentialData,
	operationsOf,
	requiredParameters,
	resolveParameters,
} from '../src/node-compile/walk.ts';

const here = dirname(fileURLToPath(import.meta.url));
const base = join(here, '../../../nodes-base');
const PREFIX = 'n8n-nodes-base.';
const load = createRequire(join(base, 'package.json'));
type LoadedNode = WalkNode & { nodeVersions?: Record<string, LoadedNode> };
const classFile = new Map<string, string>();
function findClasses(dir: string): void {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			if (!/^(test|__tests__|__schema__)$/.test(entry)) findClasses(path);
		} else if (entry.endsWith('.node.ts')) {
			for (const m of readFileSync(path, 'utf8').matchAll(/^(?:export )?class (\w+)/gm))
				classFile.set(m[1], path);
		}
	}
}
findClasses(join(base, 'nodes'));
const known: Record<string, { className: string; sourcePath: string }> = JSON.parse(
	readFileSync(join(base, 'dist/known/nodes.json'), 'utf8'),
);
const knownCredentials: Record<string, { className: string; sourcePath: string }> = JSON.parse(
	readFileSync(join(base, 'dist/known/credentials.json'), 'utf8'),
);
function nodeOf(type: string, version: number): LoadedNode | undefined {
	try {
		const entry = known[type.slice(PREFIX.length)];
		const top: LoadedNode = new (load(join(base, entry.sourcePath))[entry.className])();
		return top.nodeVersions ? top.nodeVersions[String(version)] : top;
	} catch {
		return undefined;
	}
}
const sources: NodeSources = {
	entry: (type, version) => {
		const node = nodeOf(type, version);
		return node ? classFile.get(node.constructor.name) : undefined;
	},
	readFile: (path) =>
		existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined,
	description: (type, version) => nodeOf(type, version)?.description,
	aliases: { '@utils/': `${base}/utils/` },
	evaluate: evaluateInSandbox,
	credentialEntry: (type) => {
		const entry = knownCredentials[type];
		return entry ? join(base, entry.sourcePath) : undefined;
	},
};
const registry = registryOf(loadCredentialTypes().types);

const [name, versionText, parametersText = '{}', mode = 'stopWorkflow', show = 'errors'] =
	process.argv.slice(2);
const type = `${PREFIX}${name}`;
const version = Number(versionText);
const node = nodeOf(type, version);
if (!node) throw new Error('no node');
if (parametersText === 'ops') {
	for (const op of operationsOf(node)) console.log(JSON.stringify(op));
	process.exit(0);
}
const given: Json = JSON.parse(parametersText);
if (mode === 'variants') {
	const { parameterVariants } = await import('../src/node-compile/variants.ts');
	const settled = requiredParameters(node, version, given);
	const vs = parameterVariants(node, version, settled, given, [], (field: string) => `={{ $json.${field} }}`);
	for (const v of vs)
		console.log(v.condition, v.values.length, v.form ? 'form' : '', show === 'full' ? JSON.stringify(v) : '');
	const shownNames = Object.keys(resolveParameters(node, version, settled));
	console.log('resolved:', shownNames.join(' '));
	process.exit(0);
}
const parameters = show === 'raw' ? given : requiredParameters(node, version, given);
const credential = credentialOf(node, resolveParameters(node, version, parameters));
const fields = credential
	? {
			[credential]: publicCredential(
				registry.get(credential),
				fakeCredentialData(registry, credential, () => 'key'),
			),
		}
	: {};
const compiled = compileForCheck(sources, { type, version, parameters }, fields, mode as ErrorMode);
if ('errors' in compiled) console.log(compiled.errors.join('\n'));
else if (show === 'source') console.log(compiled.source);
else console.log('compiles', JSON.stringify(parameters).slice(0, 300));
