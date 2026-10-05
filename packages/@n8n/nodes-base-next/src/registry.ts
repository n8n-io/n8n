import type { FrozenVersion } from '@n8n/node-sdk/host';
import {
	compareSemver,
	embeddedStoreDirOf,
	isVersionManifest,
	parseStoreCatalog,
	parseStoreIndex,
	STORE_CATALOG_FILE,
	storeBlobFileOf,
	storeFilesOfDir,
	storeIndexFileOf,
	storeManifestOf,
	storeReader,
	type SourcePackage,
	type StoreRecord,
} from '@n8n/node-sdk/registry';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { nodesCore } from '@n8n/nodes-core';
import { UnexpectedError } from 'n8n-workflow';

import { nodesBaseNext } from './nodes';

/**
 * The first-party source packages. n8n ships them, so the versions in their embedded stores are
 * first-party without a key check. The first package also holds the stored versions of the ids
 * that no package ships.
 */
export const FIRST_PARTY_PACKAGES: readonly [SourcePackage, ...SourcePackage[]] = [
	nodesBaseNext,
	nodesCore,
];

const packageById = new Map(
	FIRST_PARTY_PACKAGES.flatMap((pkg) =>
		[...pkg.actions, ...pkg.triggers, ...pkg.natives].map(({ id }) => [id, pkg] as const),
	),
);

/** The first-party package of an id: the package that ships it, else the first package. */
export const packageOf = (id: string): SourcePackage =>
	packageById.get(id) ?? FIRST_PARTY_PACKAGES[0];

/** The embedded store of one first-party package, or of all of them. */
const storeDirsOf = (dir?: string) => (dir ? [dir] : FIRST_PARTY_PACKAGES.map(embeddedStoreDirOf));

const textOf = (dir: string, file: string) => readFileSync(path.join(dir, file), 'utf8');

const manifestOf = (dir: string, record: StoreRecord) =>
	storeManifestOf(readFileSync(path.join(dir, storeBlobFileOf(record.manifest))), record).manifest;

const catalogOf = (dir: string) => parseStoreCatalog(textOf(dir, STORE_CATALOG_FILE));

/** A frozen version and the digest of its manifest bytes, which a node pin names. */
export type DigestedVersion = FrozenVersion & { readonly digest: string };

/**
 * The bundled versions of an action in the embedded store of its package, newest first. Other
 * versions come from the registry. They ship in the release, so they are first-party without a
 * key check.
 */
export function versionsOf(
	actionId: string,
	dir = embeddedStoreDirOf(packageOf(actionId)),
): DigestedVersion[] {
	const blobs = storeReader(storeFilesOfDir(dir));
	return parseStoreIndex(textOf(dir, storeIndexFileOf(actionId)), actionId)
		.flatMap((record): DigestedVersion[] => {
			const manifest = manifestOf(dir, record);
			if (!isVersionManifest(manifest)) return [];
			const readBundle = async () => {
				const bundle = await blobs.blob(`sha256:${manifest.bundleHash}`);
				if (!bundle) throw new UnexpectedError(`The embedded store has no bundle of ${actionId}`);
				return bundle.toString('utf8');
			};
			return [{ manifest, origin: 'first-party', readBundle, digest: record.manifest }];
		})
		.sort((a, b) => compareSemver(b.manifest.semver, a.manifest.semver));
}

/**
 * The ids of the bundled actions, triggers and providers: the versions with a bundle. Without
 * `dir`, of every first-party package.
 */
export const bundledIdsOf = (dir?: string) =>
	storeDirsOf(dir).flatMap((store) =>
		catalogOf(store).flatMap(({ id, bundle }) => (bundle === undefined ? [] : [id])),
	);

/**
 * The bundled credential manifests, with the blob file each one comes from. Without `dir`, of
 * every first-party package.
 */
export const bundledCredentialsOf = (dir?: string) =>
	storeDirsOf(dir).flatMap((store) =>
		catalogOf(store).flatMap((record) => {
			const manifest = record.kind === 'credential' ? manifestOf(store, record) : undefined;
			return manifest?.kind === 'credential'
				? [{ file: path.join(store, storeBlobFileOf(record.manifest)), manifest }]
				: [];
		}),
	);
