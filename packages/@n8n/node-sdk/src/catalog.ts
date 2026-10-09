/**
 * The contracts of source packages, as a host reads them from their embedded stores: manifests
 * only, no source code. A host lists, types and runs the node types of a package from this.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { UnexpectedError } from 'n8n-workflow';

import type { AnyCredentialType } from './credentials';
import { isToolContract, type Action, type Trigger } from './define';
import type { NativeManifest } from './manifest';
import { credentialOfManifests, evaluateBundle, nodeNameOf, type PackedVersion } from './runtime';
import {
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
} from './store';
import { compareSemver, sha256, type VersionManifest } from './version';

const textOf = (dir: string, file: string) => readFileSync(path.join(dir, file), 'utf8');

const manifestOf = (dir: string, record: StoreRecord) =>
	storeManifestOf(readFileSync(path.join(dir, storeBlobFileOf(record.manifest))), record).manifest;

const catalogOf = (dir: string) => parseStoreCatalog(textOf(dir, STORE_CATALOG_FILE));

/** A packed version and the digest of its manifest bytes, which a node pin names. */
export type DigestedVersion = PackedVersion & {
	/** `sha256:<hex>` of the manifest bytes. */
	readonly digest: string;
};

/**
 * The versions of an action in the embedded store `dir`, newest first. They ship in the release,
 * so they are first-party without a key check.
 */
export function versionsOf(actionId: string, dir: string): DigestedVersion[] {
	const blobs = storeReader(storeFilesOfDir(dir));
	return parseStoreIndex(textOf(dir, storeIndexFileOf(actionId)), actionId)
		.flatMap((record): DigestedVersion[] => {
			const manifest = manifestOf(dir, record);
			if (!isVersionManifest(manifest)) return [];
			const blobOf = async (digest: string, what: string) => {
				const bytes = await blobs.blob(digest);
				if (!bytes) throw new UnexpectedError(`The embedded store has no ${what} of ${actionId}`);
				return bytes.toString('utf8');
			};
			const { sdk } = manifest;
			return [
				{
					manifest,
					origin: 'first-party',
					readBundle: async () => await blobOf(`sha256:${manifest.bundleHash}`, 'bundle'),
					...(typeof sdk === 'object'
						? { readSdk: async () => await blobOf(sdk.digest, 'SDK runtime') }
						: {}),
					digest: record.manifest,
				},
			];
		})
		.sort((a, b) => compareSemver(b.manifest.semver, a.manifest.semver));
}

/** The ids of the actions, triggers and providers with a bundle in the embedded store `dir`. */
export const bundledIdsOf = (dir: string) =>
	catalogOf(dir).flatMap(({ id, kind, bundle }) =>
		bundle === undefined || kind === 'sdk' || kind === 'credential' ? [] : [id],
	);

/** The credential manifests in the embedded store `dir`, with the blob file of each one. */
export const bundledCredentialsOf = (dir: string) =>
	catalogOf(dir).flatMap((record) => {
		const manifest = record.kind === 'credential' ? manifestOf(dir, record) : undefined;
		return manifest?.kind === 'credential'
			? [{ file: path.join(dir, storeBlobFileOf(record.manifest)), manifest }]
			: [];
	});

/** The n8n node type of a contract of a package: the package name and the node name. */
export const contractNodeTypeOf = (packageName: string, id: string) =>
	`${packageName}.${nodeNameOf(id)}`;

/** The newest embedded version of one contract of a source package. */
export interface CatalogEntry {
	/** The name of the source package, e.g. `@n8n/nodes-core`. */
	readonly package: string;
	/** The manifest of the version. A native manifest has no bundle: a legacy node runs it. */
	readonly manifest: VersionManifest | NativeManifest;
	/**
	 * The n8n node type of a version with a bundle, e.g. `@n8n/nodes-core.httpRequestGet`. A
	 * native version runs as `manifest.native.type`.
	 */
	readonly nodeType: string;
	/** The resource of the id, e.g. `databasePage` of `notion.databasePage.getAll`. */
	readonly resource?: string;
	/** The last part of the id, e.g. `getAll`. */
	readonly operation: string;
	/**
	 * The n8n node type of the agent tool of an action that the host also gives as a tool (see
	 * `isToolContract`), e.g. `@n8n/nodes-core.httpRequestGetTool`.
	 */
	readonly toolType?: string;
}

/** The contracts of source packages, from their embedded stores. */
export interface ContractCatalog {
	/** The packages, in the order of the catalog. */
	readonly packages: readonly SourcePackage[];
	/** The newest version of each contract, by package, then as the store lists them. */
	readonly entries: readonly CatalogEntry[];
	/** The package whose embedded store has the id. */
	readonly packageOf: (id: string) => SourcePackage | undefined;
	/**
	 * The contract that the embedded bundle of an id exports, evaluated in this process at the
	 * first read, e.g. for the output hatches of an action. Only the embedded stores of the host
	 * are read, so the code ships in the release. `undefined` for an id without a bundle.
	 */
	readonly bundleOf: (id: string) => Action | Trigger | undefined;
}

/** The resource and the operation of a contract id: `<node>.<resource>.<operation>`. */
function pathOf(id: string, node: string) {
	const rest = id.startsWith(`${node}.`) ? id.slice(node.length + 1) : id;
	const dot = rest.lastIndexOf('.');
	return dot < 0
		? { operation: rest }
		: { resource: rest.slice(0, dot), operation: rest.slice(dot + 1) };
}

/** The newest manifest of each action, trigger and provider in the embedded store of `pkg`. */
function entriesOf(pkg: SourcePackage): CatalogEntry[] {
	const dir = embeddedStoreDirOf(pkg);
	return catalogOf(dir).flatMap((record) => {
		if (record.kind === 'credential' || record.kind === 'sdk') return [];
		const manifest = manifestOf(dir, record);
		if (manifest.kind === 'credential' || manifest.kind === 'sdk') return [];
		const nodeType = contractNodeTypeOf(pkg.name, manifest.id);
		const tool = isVersionManifest(manifest) && isToolContract(manifest.contract);
		return [
			{
				package: pkg.name,
				manifest,
				nodeType,
				...pathOf(manifest.id, manifest.contract.node),
				...(tool ? { toolType: `${nodeType}Tool` } : {}),
			},
		];
	});
}

/** The catalog of the embedded stores of `packages`. An id belongs to the first package that has it. */
export function contractCatalogOf(packages: readonly SourcePackage[]): ContractCatalog {
	const entries = packages.flatMap(entriesOf);
	const byId = new Map(
		[...entries].reverse().map(({ manifest, package: name }) => [manifest.id, name]),
	);
	const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
	const owned = entries.filter(({ manifest, package: name }) => byId.get(manifest.id) === name);
	const packageOf = (id: string) => {
		const name = byId.get(id);
		return name === undefined ? undefined : byName.get(name);
	};
	const bundles = new Map<string, Action | Trigger>();
	const readBundle = (id: string) => {
		const manifest = owned.find((entry) => entry.manifest.id === id)?.manifest;
		const pkg = packageOf(id);
		// A component bundle is WASM, not JS, so this process cannot evaluate it.
		if (!manifest || !('bundleHash' in manifest) || manifest.guest === 'component' || !pkg) {
			return undefined;
		}
		const read = (digest: string, what: string) => {
			const code = readFileSync(
				path.join(embeddedStoreDirOf(pkg), storeBlobFileOf(digest)),
				'utf8',
			);
			if (`sha256:${sha256(code)}` !== digest) {
				throw new UnexpectedError(
					`The ${what} of ${id}@${manifest.semver} does not match its hash`,
				);
			}
			return code;
		};
		const { sdk } = manifest;
		return evaluateBundle(
			read(`sha256:${manifest.bundleHash}`, 'bundle'),
			manifest.nodeContract,
			typeof sdk === 'object' ? read(sdk.digest, 'SDK runtime') : undefined,
			credentialOfManifests(
				bundledCredentialsOf(embeddedStoreDirOf(pkg)).map((each) => each.manifest),
			),
		);
	};
	return {
		packages,
		entries: owned,
		packageOf,
		bundleOf: (id) => {
			const known = bundles.get(id) ?? readBundle(id);
			if (known) bundles.set(id, known);
			return known;
		},
	};
}

/**
 * The compat credential type of a name, as the embedded bundle of the first contract that lists
 * the name defines it, e.g. with the base URL of the node. A compat type has no credential
 * manifest, so the host reads it from a bundle of its own release, never from a stored one.
 * `undefined` when no embedded bundle defines it.
 */
export function embeddedCompatTypeOf(
	catalog: ContractCatalog,
	name: string,
): AnyCredentialType | undefined {
	const entry = catalog.entries.find(
		({ manifest }) => 'bundleHash' in manifest && manifest.contract.credentials.includes(name),
	);
	return (entry && catalog.bundleOf(entry.manifest.id))?.node.credential?.types.find(
		(type) => type.name === name && type.scheme.kind === 'compat',
	);
}
