import type { FrozenVersion } from '@n8n/node-sdk/host';
import {
	compareSemver,
	isVersionManifest,
	parseStoreCatalog,
	parseStoreIndex,
	STORE_CATALOG_FILE,
	storeBlobFileOf,
	storeFilesOfDir,
	storeIndexFileOf,
	storeManifestOf,
	storeReader,
	type StoreRecord,
} from '@n8n/node-sdk/registry';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { UnexpectedError } from 'n8n-workflow';

/**
 * The embedded store: the HEAD of each action, trigger, credential type and native contract.
 * `pnpm freeze` writes it.
 */
export const EMBEDDED_STORE_DIR = path.resolve(__dirname, '..', 'dist', 'store');

const textOf = (dir: string, file: string) => readFileSync(path.join(dir, file), 'utf8');

const manifestOf = (dir: string, record: StoreRecord) =>
	storeManifestOf(readFileSync(path.join(dir, storeBlobFileOf(record.manifest))), record).manifest;

const catalogOf = (dir: string) => parseStoreCatalog(textOf(dir, STORE_CATALOG_FILE));

/**
 * The bundled versions of an action, newest first. Other versions come from the registry. They
 * ship in the release, so they are first-party without a key check.
 */
export function versionsOf(actionId: string, dir = EMBEDDED_STORE_DIR): FrozenVersion[] {
	const blobs = storeReader(storeFilesOfDir(dir));
	return parseStoreIndex(textOf(dir, storeIndexFileOf(actionId)), actionId)
		.flatMap((record): FrozenVersion[] => {
			const manifest = manifestOf(dir, record);
			if (!isVersionManifest(manifest)) return [];
			const readBundle = async () => {
				const bundle = await blobs.blob(`sha256:${manifest.bundleHash}`);
				if (!bundle) throw new UnexpectedError(`The embedded store has no bundle of ${actionId}`);
				return bundle.toString('utf8');
			};
			return [{ manifest, origin: 'first-party', readBundle }];
		})
		.sort((a, b) => compareSemver(b.manifest.semver, a.manifest.semver));
}

/** The ids of the bundled actions, triggers and providers: the versions with a bundle. */
export const bundledIdsOf = (dir = EMBEDDED_STORE_DIR) =>
	catalogOf(dir).flatMap(({ id, bundle }) => (bundle === undefined ? [] : [id]));

/** The bundled credential manifests, with the blob file each one comes from. */
export const bundledCredentialsOf = (dir = EMBEDDED_STORE_DIR) =>
	catalogOf(dir).flatMap((record) => {
		const manifest = record.kind === 'credential' ? manifestOf(dir, record) : undefined;
		return manifest?.kind === 'credential'
			? [{ file: path.join(dir, storeBlobFileOf(record.manifest)), manifest }]
			: [];
	});
