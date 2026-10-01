import { nodeNameOf, type Action } from '@n8n/node-sdk';
import { freezeAction, writeFrozenAction } from '@n8n/node-sdk/freeze';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { actions } from '../src/index';
import { VERSIONS_DIR } from '../src/registry';

/** One folder per service, e.g. `google-sheets/` with `actions/sheet.append.ts`. */
export const NODES_DIR = path.resolve(__dirname, '..', 'src', 'nodes');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');

/** The module and export name of each action that a file in an `actions` folder exports. */
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
				const action = actions.find((candidate) => candidate === value);
				return action ? [{ entryFile, exportName, action }] : [];
			});
		}),
	);
	return entries.flat();
}

/** Freezes the HEAD of each action into `outDir`, so the package runs without a registry. */
export async function freezeAll(outDir: string) {
	return await Promise.all(
		(await actionEntries()).map(async ({ entryFile, exportName }) => {
			const frozen = await freezeAction(entryFile, exportName);
			await writeFrozenAction(outDir, frozen);
			return frozen.manifest;
		}),
	);
}

/**
 * The n8n class file of an action, relative to `dist`. The n8n loader reads the class name
 * from the file name, so `nodes/GmailMessageGet.node.js` exports `GmailMessageGet`. The
 * service files `src/nodes/<service>/<service>.node.ts` are kebab case in a subfolder, so
 * their names never collide with a class file, and `package.json` never lists them.
 */
export function nodeClassFile({ id }: Pick<Action, 'id'>) {
	const name = nodeNameOf(id);
	const className = `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
	const source = [
		'"use strict";',
		'const { toVersionedNodeType } = require("@n8n/node-sdk");',
		'const { versionsOf } = require("../registry");',
		`class ${className} extends toVersionedNodeType(versionsOf(${JSON.stringify(id)})) {}`,
		`exports.${className} = ${className};`,
		'',
	].join('\n');
	return { file: `nodes/${className}.node.js`, className, source };
}

/** Writes one class file per action into `distDir`, after `tsc` built `dist/registry.js`. */
export function writeNodeClasses(distDir: string) {
	mkdirSync(path.join(distDir, 'nodes'), { recursive: true });
	actions.map(nodeClassFile).forEach(({ file, source }) => {
		writeFileSync(path.join(distDir, file), source);
	});
}

if (require.main === module) {
	void freezeAll(VERSIONS_DIR).then(() => writeNodeClasses(DIST_DIR));
}
