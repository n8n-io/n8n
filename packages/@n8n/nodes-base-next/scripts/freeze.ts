import { isRecord, type Action, type Trigger } from '@n8n/node-sdk';
import { freezeAction, freezeCredential } from '@n8n/node-sdk/freeze';
import { lastPublishedIn } from '@n8n/node-sdk/publish';
import { addToStore, manifestTextOf, storeFilesOfUrl, storeReader } from '@n8n/node-sdk/registry';
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { UserError } from 'n8n-workflow';

import { actions, credentialTypes, flowNatives, nativeTriggers, triggers } from '../src/index';
import { EMBEDDED_STORE_DIR } from '../src/registry';

/** One folder per service, e.g. `google-sheets/` with `actions/sheet.append.ts`. */
export const NODES_DIR = path.resolve(__dirname, '..', 'src', 'nodes');

const contracts: ReadonlyArray<Action | Trigger> = [...actions, ...triggers];

/** Legacy nodes run these, so they register but do not freeze. */
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

// The registry is the one record of published patches. A build without one freezes each HEAD as patch 0.
const REGISTRY_URL = process.env.N8N_NODE_CONTRACTS_REGISTRY_URL;
const lastOf = REGISTRY_URL
	? lastPublishedIn(storeReader(storeFilesOfUrl(REGISTRY_URL, async (url) => await fetch(url))))
	: undefined;

/** Freezes the HEAD of each action and trigger into the store in `outDir`, so the package runs without a registry. */
export async function freezeAll(outDir: string) {
	const frozen = await Promise.all(
		(await actionEntries()).map(
			async ({ entryFile, exportName }) => await freezeAction(entryFile, exportName, lastOf),
		),
	);
	await addToStore(
		outDir,
		frozen.map(({ manifest, bundle }) => ({ manifestText: manifestTextOf(manifest), bundle })),
	);
	return frozen.map(({ manifest }) => manifest);
}

/** Writes the manifest of each credential type that is not a compat type into the store in `outDir`. */
export async function freezeCredentials(outDir: string) {
	const manifests = credentialTypes.flatMap((type) => freezeCredential(type) ?? []);
	await addToStore(
		outDir,
		manifests.map((manifest) => ({ manifestText: manifestTextOf(manifest) })),
	);
	return manifests;
}

if (require.main === module) {
	// n8n loads every version here, so a removed action must not stay from an older build.
	rmSync(EMBEDDED_STORE_DIR, { recursive: true, force: true });
	void Promise.all([freezeAll(EMBEDDED_STORE_DIR), freezeCredentials(EMBEDDED_STORE_DIR)]);
}
