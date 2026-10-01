import { freezeAction, writeFrozenAction } from '@n8n/node-sdk/freeze';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { actions } from '../src/index';
import { VERSIONS_DIR } from '../src/registry';

const NODES_DIR = path.resolve(__dirname, '..', 'src', 'nodes');

/** The module and export name of each action that a module under `src/nodes` exports. */
export async function actionEntries() {
	const files = readdirSync(NODES_DIR, { recursive: true, encoding: 'utf8' }).filter(
		(file) => file.endsWith('.ts') && !file.endsWith('.node.ts'),
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

if (require.main === module) {
	void freezeAll(VERSIONS_DIR);
}
