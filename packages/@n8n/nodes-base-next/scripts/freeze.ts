import type { Action, Trigger } from '@n8n/node-sdk';
import {
	freezeAction,
	freezeCredential,
	writeCredentialManifest,
	writeFrozenAction,
} from '@n8n/node-sdk/freeze';
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

import { actions, credentialTypes, triggers } from '../src/index';
import { VERSIONS_DIR } from '../src/registry';

/** One folder per service, e.g. `google-sheets/` with `actions/sheet.append.ts`. */
export const NODES_DIR = path.resolve(__dirname, '..', 'src', 'nodes');

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

if (require.main === module) {
	// n8n loads every folder here, so a removed action must not stay from an older build.
	rmSync(VERSIONS_DIR, { recursive: true, force: true });
	void Promise.all([freezeAll(VERSIONS_DIR), freezeCredentials(VERSIONS_DIR)]);
}
