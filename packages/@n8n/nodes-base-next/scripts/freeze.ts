import { isRecord, type Action, type Trigger } from '@n8n/node-sdk';
import {
	freezeAction,
	freezeCredential,
	writeCredentialManifest,
	writeFrozenAction,
} from '@n8n/node-sdk/freeze';
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { UserError } from 'n8n-workflow';

import { actions, credentialTypes, flowNatives, nativeTriggers, triggers } from '../src/index';
import { VERSIONS_DIR } from '../src/registry';

/** One folder per service, e.g. `google-sheets/` with `actions/sheet.append.ts`. */
export const NODES_DIR = path.resolve(__dirname, '..', 'src', 'nodes');

const contracts: ReadonlyArray<Action | Trigger> = [...actions, ...triggers];

/** Built-in n8n nodes run these, so they register but do not freeze. */
const natives: ReadonlyArray<Action | Trigger> = [...nativeTriggers, ...flowNatives];

const isRegistered = (value: unknown) =>
	[...contracts, ...natives].some((known) => known === value);

const looksLikeAction = (value: unknown) =>
	isRecord(value) && typeof value.id === 'string' && isRecord(value.inputSchema);

/**
 * The module and export name of each action or trigger that a file in an `actions` folder exports.
 * A file without a registered export, or an action export that `src/index.ts` does not list, is an
 * error, because freeze would drop it without a sign.
 */
export async function actionEntries() {
	const files = readdirSync(NODES_DIR, { recursive: true, encoding: 'utf8' }).filter(
		(file) => path.basename(path.dirname(file)) === 'actions' && file.endsWith('.ts'),
	);
	const modules = await Promise.all(
		files.map(async (file) => {
			const entryFile = path.join(NODES_DIR, file);
			const module: unknown = await import(entryFile);
			const exported = typeof module === 'object' && module !== null ? Object.entries(module) : [];
			return { file, entryFile, exported };
		}),
	);
	const unlisted = modules.flatMap(({ file, exported }) =>
		exported.some(([, value]) => isRegistered(value))
			? exported
					.filter(([, value]) => looksLikeAction(value) && !isRegistered(value))
					.map(([exportName]) => `${file}#${exportName}`)
			: [file],
	);
	if (unlisted.length > 0) {
		throw new UserError(
			`These action files or exports are not actions of src/index.ts: ${unlisted.join(', ')}. Add the action to actions or triggers.`,
		);
	}
	return modules.flatMap(({ entryFile, exported }) =>
		exported.flatMap(([exportName, value]) => {
			const action = contracts.find((candidate) => candidate === value);
			return action ? [{ entryFile, exportName, action }] : [];
		}),
	);
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
