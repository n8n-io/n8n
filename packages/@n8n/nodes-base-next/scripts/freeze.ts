import type { Action, Trigger } from '@n8n/node-sdk';
import type { AnyCredentialType } from '@n8n/node-sdk/credentials';
import { nodeNameOf } from '@n8n/node-sdk/host';
import {
	freezeAction,
	freezeCredential,
	writeCredentialManifest,
	writeFrozenAction,
} from '@n8n/node-sdk/freeze';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { actions, credentialTypes, triggers } from '../src/index';
import { VERSIONS_DIR } from '../src/registry';

/** One folder per service, e.g. `google-sheets/` with `actions/sheet.append.ts`. */
export const NODES_DIR = path.resolve(__dirname, '..', 'src', 'nodes');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const contracts: ReadonlyArray<Action | Trigger> = [...actions, ...triggers];

/** The module and export name of each action or trigger that a file in an `actions` folder exports. */
export async function actionEntries() {
	const files = readdirSync(NODES_DIR, { recursive: true, encoding: 'utf8' }).filter(
		(file) => path.basename(path.dirname(file)) === 'actions' && file.endsWith('.ts'),
	);
	const entries = await Promise.all(
		files.map(async (file) => {
			const entryFile = path.join(NODES_DIR, file);
			const module: unknown = await import(entryFile);
			const exported = typeof module === 'object' && module !== null ? Object.entries(module) : [];
			return exported.flatMap(([exportName, value]) => {
				const action = contracts.find((candidate) => candidate === value);
				return action ? [{ entryFile, exportName, action }] : [];
			});
		}),
	);
	return entries.flat();
}

/** Freezes the HEAD of each action and trigger into `outDir`, so the package runs without a registry. */
export async function freezeAll(outDir: string) {
	return await Promise.all(
		(await actionEntries()).map(async ({ entryFile, exportName }) => {
			const frozen = await freezeAction(entryFile, exportName);
			await writeFrozenAction(outDir, frozen);
			return frozen.manifest;
		}),
	);
}

/** Writes the manifest of each credential type that is not a compat type into `outDir`. */
export async function freezeCredentials(outDir: string) {
	const manifests = credentialTypes.flatMap((type) => freezeCredential(type) ?? []);
	await Promise.all(
		manifests.map(async (manifest) => await writeCredentialManifest(outDir, manifest)),
	);
	return manifests;
}

/**
 * The n8n class file of an action, relative to `dist`. The n8n loader reads the class name
 * from the file name, so `nodes/GmailMessageGet.node.js` exports `GmailMessageGet`. The
 * service files `src/nodes/<service>/<service>.node.ts` are kebab case in a subfolder, so
 * their names never collide with a class file, and `package.json` never lists them.
 */
export function nodeClassFile(contract: Pick<Action, 'id'> | Pick<Trigger, 'id' | 'kind'>) {
	const { id } = contract;
	const name = nodeNameOf(id);
	const className = `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
	const typeOf = 'kind' in contract ? 'toVersionedTriggerType' : 'toVersionedNodeType';
	const source = [
		'"use strict";',
		`const { ${typeOf} } = require("@n8n/node-sdk/host");`,
		'const { versionsOf } = require("../registry");',
		`class ${className} extends ${typeOf}(versionsOf(${JSON.stringify(id)})) {}`,
		`exports.${className} = ${className};`,
		'',
	].join('\n');
	return { file: `nodes/${className}.node.js`, className, source };
}

/** Writes one class file per action and trigger into `distDir`, after `tsc` built `dist/registry.js`. */
export function writeNodeClasses(distDir: string) {
	mkdirSync(path.join(distDir, 'nodes'), { recursive: true });
	contracts.map(nodeClassFile).forEach(({ file, source }) => {
		writeFileSync(path.join(distDir, file), source);
	});
}

/**
 * The n8n class file of a credential type, relative to `dist`. The class has the legacy name, e.g.
 * `credentials/NotionApi.credentials.js` exports `NotionApi` with the type `notionApi`.
 */
export function credentialClassFile(type: Pick<AnyCredentialType, 'id' | 'name'>) {
	const className = `${type.name.charAt(0).toUpperCase()}${type.name.slice(1)}`;
	const source = [
		'"use strict";',
		'const { toCredentialType } = require("@n8n/node-sdk/host");',
		'const { credentialTypes } = require("../index");',
		`const type = credentialTypes.find(({ id }) => id === ${JSON.stringify(type.id)});`,
		`class ${className} {`,
		'\tconstructor() {',
		'\t\tObject.assign(this, toCredentialType(type));',
		'\t}',
		'}',
		`exports.${className} = ${className};`,
		'',
	].join('\n');
	return { file: `credentials/${className}.credentials.js`, className, source };
}

/** Writes one class file per credential type into `distDir`, after `tsc` built `dist/index.js`. */
export function writeCredentialClasses(distDir: string) {
	mkdirSync(path.join(distDir, 'credentials'), { recursive: true });
	credentialTypes.map(credentialClassFile).forEach(({ file, source }) => {
		writeFileSync(path.join(distDir, file), source);
	});
}

if (require.main === module) {
	void Promise.all([freezeAll(VERSIONS_DIR), freezeCredentials(VERSIONS_DIR)]).then(() => {
		writeNodeClasses(DIST_DIR);
		writeCredentialClasses(DIST_DIR);
	});
}
