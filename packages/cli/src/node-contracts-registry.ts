import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { EventService } from '@n8n/backend-services';
import { GlobalConfig, NodesConfig, type NodePermissionClass } from '@n8n/config';
import {
	NodeContractStatusRepository,
	NodeContractVersionRepository,
	WorkflowRepository,
	type NodeContractManifestRow,
} from '@n8n/db';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { readFile } from 'fs/promises';
import {
	credentialTypeOfManifest,
	hostRuntime,
	nodeContractRangeOf,
	nodeNameOf,
	permissionsOf,
	runsNodeContract,
	toVersionedNodeType,
	toVersionedToolType,
	toVersionedTriggerType,
	verifiedBundleOf,
	type PackedVersion,
	type HostRuntime,
	type PermissionRefusal,
} from '@n8n/node-sdk/host';
import {
	bundledCredentialsOf,
	bundledIdsOf,
	compareSemver,
	deniedPermissionClassOf,
	embeddedContractsOf,
	embeddedStoreDirOf,
	isStoreStatusRecord,
	storeIndexFileOf,
	versionsOf,
	type ContractKeys,
	type ContractStore,
	type CredentialManifest,
	type InstanceStore,
	type SourcePackage,
	type StoreStatusRecord,
} from '@n8n/node-sdk/registry';
import type { RuntimeAvailability, RuntimeName } from '@n8n/node-sdk/runtimes';
import type { GuestRuntime } from '@n8n/node-sdk/sandbox';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { existsSync } from 'fs';
import {
	credentialTypeToJSON,
	DirectoryLoader,
	InstanceSettings,
	UnrecognizedCredentialTypeError,
	UnrecognizedNodeTypeError,
	validateNodeDescription,
	type Types,
} from 'n8n-core';
import {
	deepCopy,
	isToolType,
	jsonParse,
	type VersionedNodeType,
	type ICredentialType,
	type ICredentialTypeData,
	type INode,
	type INodeProperties,
	type INodeTypeDescription,
	type KnownNodesAndCredentials,
	type IVersionedNodeType,
	type LoadedClass,
	type NodeLoader,
} from 'n8n-workflow';
import path from 'path';
import { promisify } from 'util';

import { CredentialTypes } from '@/credential-types';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import {
	FALLBACK_PACKAGE,
	fallbackPackage,
	firstPartyCatalog,
	firstPartyPackages,
	isContractNodeType,
	MIGRATED_NODES,
	migratedSlotOf,
	packageNameOf,
	customActionCredentialTypeOf,
	sandboxCredentialTypeOf,
	toolEntries,
	toolIdOf,
	withMigratedVersions,
} from '@/node-contracts-catalog';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { convertNodeToAiTool } from '@/tool-generation';

// Recent executions only; a contract node reads the meta of its own execution.
const MAX_CACHED_EXECUTIONS = 100;

// Each session key keeps this many guests started. A pool has no cap across keys yet.
const POOL_SIZE = 1;

/**
 * The versions that n8n does not bundle, in the `node_contract_version` table. Every main and
 * worker reads the same rows. Only the leader main and the `contracts:*` commands fetch from the
 * registry, so a worker never needs registry egress.
 */
@Service()
export class NodeContractsStore {
	private readonly stores = new Map<string, Promise<ContractStore>>();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly repository: NodeContractVersionRepository,
		private readonly statusRepository: NodeContractStatusRepository,
	) {}

	/** The folder of files that belong to the store, e.g. the sandbox cache. */
	get dir() {
		return path.join(this.instanceSettings.n8nFolder, 'node-contracts');
	}

	/** The rows of the table, and the versions that ship in the release. */
	readonly rows: InstanceStore = {
		embedded: embeddedContractsOf(firstPartyPackages()),
		manifests: async (id) => (await this.repository.findManifests(id)).map(storedManifestOf),
		credentialManifests: async () =>
			(await this.repository.findCredentialManifests()).map(storedManifestOf),
		has: async (digest) => await this.repository.existsByDigest(digest),
		bundle: async (digest) => (await this.repository.findBundle(digest)) ?? undefined,
		versions: async () =>
			(await this.repository.findAllForExport()).map((row) => ({
				id: row.contractId,
				version: row.version,
				kind: row.kind,
				manifest: row.digest,
				manifestText: row.manifest,
				bundle: row.bundle ?? undefined,
				fixtures: row.fixtures ?? undefined,
				signatures: row.signatures,
				published: row.published?.toISOString(),
				origin: row.origin,
			})),
		insert: async (versions) => {
			await this.repository.insertNew(
				versions.map((version) => ({
					digest: version.manifest,
					contractId: version.id,
					version: version.version,
					kind: version.kind,
					manifest: version.manifestText,
					bundle: version.bundle ?? null,
					fixtures: version.fixtures ?? null,
					signatures: [...(version.signatures ?? [])],
					published: publishedDateOf(version.published),
					origin: version.origin,
					// A version from a registry or a store folder has no author on this instance.
					createdById: null,
				})),
			);
		},
		statuses: async (id) => (await this.statusRepository.findLines(id)).flatMap(statusOfLine),
		insertStatuses: async (statuses) => {
			await this.statusRepository.insertNew(statuses.map(statusRowOf));
		},
		installed: (installs) => {
			const events = Container.get(EventService);
			installs.forEach((install) => {
				Container.get(Logger).info(
					`Installed node contract ${install.id}@${install.version}${install.previousVersion ? ` (from ${install.previousVersion})` : ''}`,
					{ origin: install.origin, addedPermissions: install.addedPermissions },
				);
				events.emit('node-contract-installed', install);
			});
		},
	};

	/** Only the leader main and the `contracts:*` commands fetch from the registry and add rows. */
	mayFetch() {
		const { instanceType, isFollower } = this.instanceSettings;
		return instanceType === 'main' && !isFollower;
	}

	/** Tells the other mains to list the stored versions again. Send it once after each batch of adds. */
	async reloadOtherMains() {
		await Container.get(Publisher).publishCommand({ command: 'reload-node-contracts' });
	}

	/** Another main added versions: the node types list them now. */
	@OnPubSubEvent('reload-node-contracts', { instanceType: 'main' })
	async reloadNodeTypes() {
		await Container.get(LoadNodesAndCredentials).refreshNodeTypes();
	}

	/** PEM of the keys that prove the origin of a version. A key without a file is `undefined`. */
	async keys(): Promise<ContractKeys> {
		const { nodeContractsFirstPartyKeyFile, nodeContractsVettingKeyFile } =
			this.globalConfig.instanceAi;
		const pemOf = async (file: string) => (file ? await readFile(file, 'utf8') : undefined);
		return {
			firstParty: await pemOf(nodeContractsFirstPartyKeyFile),
			vetting: await pemOf(nodeContractsVettingKeyFile),
		};
	}

	/** The store with the configured npm registry, or with `registryUrl`. */
	async open(registryUrl = this.globalConfig.instanceAi.nodeContractsNpmRegistry) {
		const known = this.stores.get(registryUrl);
		if (known) return await known;
		const opened = this.create(registryUrl);
		this.stores.set(registryUrl, opened);
		return await opened;
	}

	private async create(registryUrl: string) {
		const { contractStore } = await import('@n8n/node-sdk/registry');
		const { instanceAi } = this.globalConfig;
		return contractStore({
			registryUrl,
			npmScope: instanceAi.nodeContractsNpmScope,
			npmToken: instanceAi.nodeContractsNpmToken,
			keys: await this.keys(),
			store: this.rows,
			runsNodeContract: (version) =>
				runsNodeContract(nodeContractRangeOf(instanceAi.nodeContractRange), version),
			// A worker and a follower main read the rows that the leader main fetched.
			mayFetch: () => this.mayFetch(),
			// The registry URL is operator config, not user input, so the SSRF policy does not apply.
			fetch: async (url, init) =>
				await Container.get(OutboundHttp)
					.transport({ useDefaultSsrfPolicy: 'unsafe' })
					.asCustomFetch()(url, init),
		});
	}
}

const storedManifestOf = (row: NodeContractManifestRow) => ({
	id: row.contractId,
	version: row.version,
	kind: row.kind,
	manifest: row.digest,
	manifestText: row.manifest,
	signatures: row.signatures,
	origin: row.origin,
});

// A row holds a line that the store took, so a line that does not parse is only skipped.
function statusOfLine(line: string): StoreStatusRecord[] {
	const value = jsonParse<unknown>(line, { fallbackValue: null });
	return isStoreStatusRecord(value) ? [value] : [];
}

function statusRowOf(status: StoreStatusRecord) {
	const line = JSON.stringify(status);
	const digest = `sha256:${createHash('sha256').update(line).digest('hex')}`;
	return { digest, contractId: status.id, line };
}

// The signature does not cover `published`, so a value that is not a date is dropped.
function publishedDateOf(published: string | undefined) {
	const date = published === undefined ? undefined : new Date(published);
	return date && !Number.isNaN(date.getTime()) ? date : null;
}

/** What the loader reads of the instance store. */
type StoredContracts = Pick<ContractStore, 'versions' | 'credentials'> &
	Partial<Pick<ContractStore, 'withdrawal'>>;

const openContractStore = async (): Promise<StoredContracts> =>
	await Container.get(NodeContractsStore).open();

/** Whether a package other than the node contracts has a credential type of this name. */
const hasOtherCredentialTypeInN8n = (name: string) =>
	Object.values(Container.get(LoadNodesAndCredentials).loaders).some(
		(loader) => !(loader instanceof ContractNodeLoader) && name in loader.known.credentials,
	);

const majorOf = ({ manifest }: PackedVersion) => manifest.contract.version;

/** One node type of the contract loader and the packed versions it projects. */
interface ContractNode extends LoadedClass<VersionedNodeType> {
	readonly versions: readonly PackedVersion[];
}

/** The packages of the legacy nodes that a contract node can stand for. */
const LEGACY_PACKAGES = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'];

/** The icon that a bundled node sets, from its embedded bundle. A node that n8n does not bundle has none. */
const nodeIconOf = (id: string) => firstPartyCatalog().bundleOf(id)?.node.icon;

/** What the editor shows of a node type besides its form: the icon, the panel categories, the color. */
type Presentation = Pick<INodeTypeDescription, 'icon' | 'iconUrl' | 'iconColor' | 'codex'> & {
	readonly color?: string;
};

/**
 * The presentation of a description. The codex has no aliases: the AI builder search ranks node
 * types by them, and the nodes panel lists a contract node type under its legacy node item.
 */
const presentationOf = ({
	icon,
	iconUrl,
	iconColor,
	codex,
	defaults,
}: INodeTypeDescription): Presentation => ({
	...(icon !== undefined && { icon }),
	...(iconUrl !== undefined && { iconUrl }),
	...(iconColor !== undefined && { iconColor }),
	...(codex !== undefined && {
		codex: {
			categories: codex.categories,
			subcategories: codex.subcategories,
			resources: codex.resources,
		},
	}),
	...(defaults.color !== undefined && { color: defaults.color }),
});

const presented = (
	description: INodeTypeDescription,
	{ color, ...presentation }: Presentation,
): INodeTypeDescription => ({
	...description,
	...presentation,
	...(color !== undefined && { defaults: { ...description.defaults, color } }),
});

/**
 * The description of the default version of each visible node type of the legacy packages, by
 * full node type.
 */
async function legacyDescriptionsOf(loaders: Readonly<Record<string, NodeLoader>>) {
	const legacy = LEGACY_PACKAGES.flatMap((name) => loaders[name] ?? []);
	// A reload of the node contracts can come after the other loaders released their types.
	await Promise.all(legacy.map(async (loader) => await loader.ensureTypesLoaded()));
	const isDefault = ({ version, defaultVersion }: INodeTypeDescription) =>
		defaultVersion === undefined || [version].flat().includes(defaultVersion);
	return new Map(
		legacy.flatMap(({ packageName, types }) =>
			types.nodes
				.filter((description) => !description.hidden && isDefault(description))
				.map((description) => [`${packageName}.${description.name}`, description] as const),
		),
	);
}

/**
 * The full node type of the legacy node that a contract stands for, if n8n has it. The legacy node
 * has the node id as name (`n8n-nodes-base.slack` for `slack.message.send`), or the action name for
 * an action without a resource (`n8n-nodes-base.set` for `items.set`).
 */
function legacyNodeTypeOf(
	{ id, node }: Pick<PackedVersion['manifest']['contract'], 'id' | 'node'>,
	legacy: ReadonlyMap<string, INodeTypeDescription>,
) {
	const [, ...segments] = id.split('.');
	const names = segments.length === 1 ? [node, ...segments] : [node];
	return names
		.flatMap((name) => LEGACY_PACKAGES.map((pkg) => `${pkg}.${name}`))
		.find((nodeType) => legacy.has(nodeType));
}

/**
 * A custom action: a version that someone on this instance made in the form. No trusted key signs
 * it, and it runs n8n's HTTP guest on its config.
 */
export const isCustomAction = ({ manifest, origin }: Pick<PackedVersion, 'manifest' | 'origin'>) =>
	origin === 'private' && manifest.guest === 'http';

/**
 * The description of a custom action: its app for the nodes panel (with the legacy node of the
 * same id, e.g. GitHub), and a notice of where its requests go, because no reviewer read it.
 */
function customDescriptionOf(
	description: INodeTypeDescription,
	{ manifest }: PackedVersion,
	legacyNodeType: string | undefined,
	hidden: boolean,
): INodeTypeDescription {
	const { node, nodeDisplayName, egress } = manifest.contract;
	const hosts = egress?.hosts ?? [];
	const notice: INodeProperties = {
		displayName:
			hosts.length > 0
				? `Custom action. It sends requests to ${hosts.join(', ')}.`
				: 'Custom action. It sends requests to the server in the credential.',
		name: 'customActionHosts',
		type: 'notice',
		default: '',
	};
	const app = {
		id: node,
		displayName: nodeDisplayName,
		...(legacyNodeType ? { nodeType: legacyNodeType } : {}),
	};
	return {
		...description,
		codex: { ...description.codex, app },
		properties: [notice, ...description.properties],
		...(hidden && { hidden: true }),
	};
}

/**
 * The node type of the packed versions of one id, with the presentation of its legacy node, else
 * the icon of its node, and the parameters n8n adds to every node. The nodes panel lists an action
 * or a trigger as an action of its legacy node item. A provider is a sub-node, so the panel does
 * not list it under an app item.
 */
function contractNodeTypeOf(
	versions: readonly PackedVersion[],
	legacy: ReadonlyMap<string, INodeTypeDescription>,
	runtime: HostRuntime,
	hidden = false,
) {
	const [head] = versions;
	const typeOf = head?.manifest.kind === 'trigger' ? toVersionedTriggerType : toVersionedNodeType;
	const type = new (typeOf(versions, runtime))();
	const legacyNodeType = head && legacyNodeTypeOf(head.manifest.contract, legacy);
	const twin = legacyNodeType && legacy.get(legacyNodeType);
	const icon = head && !twin ? nodeIconOf(head.manifest.id) : undefined;
	const presentation = twin ? presentationOf(twin) : icon && { icon };
	const custom = versions.length > 0 && versions.every(isCustomAction);
	// The nodes panel groups a custom action under its app (`codex.app`), so it has no item.
	const nodeCreatorItem = head?.manifest.kind === 'provider' || custom ? undefined : legacyNodeType;
	for (const version of Object.values(type.nodeVersions)) {
		if (presentation) version.description = presented(version.description, presentation);
		if (nodeCreatorItem) version.description = { ...version.description, nodeCreatorItem };
		if (head && custom) {
			version.description = customDescriptionOf(version.description, head, legacyNodeType, hidden);
		}
		DirectoryLoader.applySpecialNodeParameters(version);
		validateNodeDescription(version.description);
	}
	return type;
}

const credentialNamesOf = ({ nodeVersions }: VersionedNodeType) =>
	Object.values(nodeVersions).flatMap(({ description }) =>
		(description.credentials ?? []).map(({ name }) => name),
	);

/**
 * The node and credential types of the node contracts of one first-party package, from manifests
 * only: one versioned node type for each id of the package with the bundled HEAD and the stored
 * versions of its other majors, and the bundled credential manifests with the stored ones of
 * other names. The type names keep the package name as prefix. A node type shows the icon and
 * codex of the legacy node it stands for. The loader of `FALLBACK_PACKAGE` also loads the stored
 * ids and credential types that no package ships.
 */
export class ContractNodeLoader implements NodeLoader {
	readonly packageName: string;

	private readonly storeDir: string;

	known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	types: Types = { nodes: [], credentials: [] };

	private nodes: ReadonlyMap<string, ContractNode> = new Map();

	private credentialTypes: ICredentialTypeData = {};

	private typesReleased = false;

	/**
	 * `excludeNodes` and `includeNodes` hold full node type names, as `N8N_NODES_EXCLUDE` does.
	 * `deny` holds the permission classes of `N8N_NODE_PERMISSIONS_DENY`. `legacyLoaders` gives the
	 * loaders of the legacy nodes, whose icons and codex the contract nodes show. `source` is the
	 * first-party package of the node types. Every node type runs with `runtime`, which the host
	 * gives every contract loader, see `contractNodeLoadersOf`.
	 */
	constructor(
		readonly runtime: HostRuntime,
		private readonly excludeNodes: readonly string[] = [],
		private readonly includeNodes: readonly string[] = [],
		private readonly openStore: () => Promise<StoredContracts> = openContractStore,
		private readonly deny: readonly NodePermissionClass[] = [],
		private readonly hasOtherCredentialType = hasOtherCredentialTypeInN8n,
		private readonly legacyLoaders: () => Readonly<Record<string, NodeLoader>> = () => ({}),
		source: SourcePackage = fallbackPackage(),
	) {
		this.packageName = source.name;
		this.storeDir = embeddedStoreDirOf(source);
	}

	async loadAll() {
		const [stored, storedCredentials, legacy] = await Promise.all([
			this.fromStore(async (store) => await store.versions(), new Map()),
			this.fromStore(async (store) => await store.credentials(), new Map()),
			legacyDescriptionsOf(this.legacyLoaders()),
		]);
		// A yanked custom action leaves the nodes panel. Its pinned nodes keep running.
		const yanked = new Set(
			await this.fromStore(
				async (store) =>
					(
						await Promise.all(
							[...stored.values()]
								.flatMap((versions) => versions.filter(isCustomAction))
								.map(async (version) =>
									(await store.withdrawal?.(version)) ? [version.manifest.id] : [],
								),
						)
					).flat(),
				[],
			),
		);
		const bundled = new Set(bundledIdsOf(this.storeDir));
		const ownStored = [...stored.keys()].filter((id) => packageNameOf(id) === this.packageName);
		this.nodes = new Map(
			[...new Set([...bundled, ...ownStored])].filter(this.loads).flatMap((id) => {
				const head = bundled.has(id) ? versionsOf(id, this.storeDir) : [];
				const majors = new Set(head.map(majorOf));
				const versions = [
					...head,
					...(stored.get(id) ?? []).filter(
						(version) =>
							!majors.has(majorOf(version)) &&
							this.runtime.runsNodeContract(version.manifest.nodeContract),
					),
				]
					.filter(this.permits)
					// Newest first: contractNodeTypeOf describes the node from the first version.
					.sort((a, b) => compareSemver(b.manifest.semver, a.manifest.semver));
				if (versions.length === 0) return [];
				const sourcePath = bundled.has(id)
					? path.join(this.storeDir, storeIndexFileOf(id))
					: Container.get(NodeContractsStore).dir;
				const node: ContractNode = {
					type: contractNodeTypeOf(versions, legacy, this.runtime, yanked.has(id)),
					sourcePath,
					versions,
				};
				return [[nodeNameOf(id), node] as const];
			}),
		);
		const credentials = this.credentialManifestsOf(storedCredentials).map(({ file, manifest }) => {
			const supportedNodes = [...this.nodes]
				.filter(([, { type }]) => credentialNamesOf(type).includes(manifest.name))
				.map(([name]) => name);
			const type = {
				...credentialTypeOfManifest(manifest),
				supportedNodes,
				toJSON: credentialTypeToJSON,
			};
			return { id: manifest.id, sourcePath: file, type };
		});
		this.credentialTypes = Object.fromEntries(
			credentials.map(({ sourcePath, type }) => [type.name, { type, sourcePath }]),
		);
		this.known = {
			nodes: Object.fromEntries(
				[...this.nodes].map(([name, { versions, sourcePath }]) => [
					name,
					{ className: versions[0]?.manifest.id ?? name, sourcePath },
				]),
			),
			credentials: Object.fromEntries(
				credentials.map(({ id, sourcePath, type }) => [
					type.name,
					{ className: id, sourcePath, extends: type.extends, supportedNodes: type.supportedNodes },
				]),
			),
		};
		this.types = this.typesOf();
		this.typesReleased = false;
		if (this.packageName === FALLBACK_PACKAGE) await this.publishCustomActions(stored, yanked);
	}

	/** Gives the Instance AI builder the newest major of each listed custom action. */
	private async publishCustomActions(
		stored: ReadonlyMap<string, readonly PackedVersion[]>,
		yanked: ReadonlySet<string>,
	) {
		const newest = [...stored.values()].flatMap((versions) => {
			const custom = versions.filter(isCustomAction);
			const latest = custom.reduce<PackedVersion | undefined>(
				(best, version) =>
					best && best.manifest.contract.version > version.manifest.contract.version
						? best
						: version,
				undefined,
			);
			return latest && !yanked.has(latest.manifest.id) ? [latest] : [];
		});
		const exported = await Promise.all(
			newest.map(
				async (version) => await verifiedBundleOf(version, this.runtime.nodeContractRange),
			),
		);
		const { setPublishedActions } = await import('@n8n/instance-ai');
		setPublishedActions(exported.flatMap((action) => ('kind' in action ? [] : [action])));
	}

	/** The packed versions that the node type of a node name projects. */
	packedVersionsOf(name: string): readonly PackedVersion[] {
		return this.nodes.get(name)?.versions ?? [];
	}

	getNode(nodeType: string): LoadedClass<VersionedNodeType> {
		const node = this.nodes.get(nodeType);
		if (!node) throw new UnrecognizedNodeTypeError(this.packageName, nodeType);
		return node;
	}

	getCredential(credentialType: string) {
		const loaded = this.credentialTypes[credentialType];
		if (!loaded) throw new UnrecognizedCredentialTypeError(credentialType);
		return loaded;
	}

	reset() {
		this.known = { nodes: {}, credentials: {} };
		this.types = { nodes: [], credentials: [] };
		this.nodes = new Map();
		this.credentialTypes = {};
	}

	releaseTypes() {
		this.types = { nodes: [], credentials: [] };
		this.typesReleased = true;
	}

	/** The types are the descriptions of the loaded node types, so no file is read again. */
	async ensureTypesLoaded() {
		if (!this.typesReleased) return;
		this.types = this.typesOf();
		this.typesReleased = false;
	}

	resolveSourcePath(sourcePath: string) {
		return sourcePath;
	}

	/** A read of the instance store. A failed read is logged, and the loader goes on without it. */
	private async fromStore<T>(read: (store: StoredContracts) => Promise<T>, empty: T): Promise<T> {
		try {
			return await read(await this.openStore());
		} catch (error) {
			Container.get(Logger).error('Cannot read the node contracts store', {
				error: ensureError(error),
			});
			return empty;
		}
	}

	/**
	 * The bundled credential manifests of the package, and for `FALLBACK_PACKAGE` the stored ones
	 * of names that n8n does not bundle, e.g. a type that a stored version pins. A stored type
	 * never replaces the type of another package, e.g. a legacy class. A stored type that n8n
	 * cannot project is skipped.
	 */
	private credentialManifestsOf(stored: ReadonlyMap<string, CredentialManifest>) {
		const bundled = bundledCredentialsOf(this.storeDir);
		if (this.packageName !== FALLBACK_PACKAGE) return bundled;
		const names = new Set(
			firstPartyPackages().flatMap((pkg) =>
				bundledCredentialsOf(embeddedStoreDirOf(pkg)).map(({ manifest }) => manifest.name),
			),
		);
		const others = [...stored.values()].filter((manifest) => {
			if (names.has(manifest.name) || this.hasOtherCredentialType(manifest.name)) return false;
			if (manifest.scheme.kind !== 'custom') return true;
			Container.get(Logger).warn(
				`${manifest.id}@${manifest.semver} does not load: a custom scheme needs a credential bundle`,
			);
			return false;
		});
		const file = others.length > 0 ? Container.get(NodeContractsStore).dir : '';
		return [...bundled, ...others.map((manifest) => ({ file, manifest }))];
	}

	/** Whether `N8N_NODE_PERMISSIONS_DENY` lets a version load, for bundled and stored versions alike. */
	private readonly permits = (version: PackedVersion) => {
		const denied = deniedPermissionClassOf(version, this.deny);
		if (denied === undefined) return true;
		const { id, semver } = version.manifest;
		const message = `${id}@${semver} does not load: N8N_NODE_PERMISSIONS_DENY denies its permission class "${denied}"`;
		Container.get(Logger).warn(message);
		Container.get(EventService).emit('node-permission-refused', {
			action: id,
			version: semver,
			permission: denied,
			message,
		});
		return false;
	};

	/** Whether the settings load the node type of an id. An include list without it loads nothing. */
	private readonly loads = (id: string) => {
		const nodeType = `${this.packageName}.${nodeNameOf(id)}`;
		return (
			!this.excludeNodes.includes(nodeType) &&
			(this.includeNodes.length === 0 || this.includeNodes.includes(nodeType))
		);
	};

	/** One description per major, the newest first, as the directory loaders list them. */
	private typesOf(): Types {
		return {
			nodes: [...this.nodes.values()].flatMap(({ type }) =>
				Object.values(type.nodeVersions)
					.reverse()
					.map(({ description }) => description),
			),
			credentials: Object.values(this.credentialTypes).map(({ type }) => type),
		};
	}
}

/** The guest runtimes of node contracts. Each one is made at its first use and closed at shutdown. */
@Service()
export class NodeContractsRuntimes {
	private readonly made = new Map<RuntimeName, GuestRuntime & { close(): void }>();

	/** The runtime of `name`, made by `make` at the first call. */
	get(name: RuntimeName, make: () => GuestRuntime & { close(): void }) {
		const known = this.made.get(name);
		if (known) return known;
		const runtime = make();
		this.made.set(name, runtime);
		return runtime;
	}

	@OnShutdown()
	close() {
		this.made.forEach((runtime) => runtime.close());
		this.made.clear();
	}
}

/** Why the `wasm` runtime cannot start: the sidecar or the guests are missing. */
function wasmMissingOf({ instanceAi }: GlobalConfig) {
	const sidecar = instanceAi.nodeContractSandboxSidecar;
	const guests = instanceAi.nodeContractSandboxGuests;
	if (!sidecar || !guests) {
		return 'N8N_NODE_CONTRACT_SANDBOX_SIDECAR or N8N_NODE_CONTRACT_SANDBOX_GUESTS is not set';
	}
	const files = [
		sidecar,
		...['action.wasm', 'provider.wasm', 'trigger.wasm'].map((guest) => path.join(guests, guest)),
	];
	const missing = files.filter((file) => !existsSync(file));
	return missing.length > 0 ? `the sandbox files are missing: ${missing.join(', ')}` : undefined;
}

/** The OCI runtime of docker, or why the `container` runtime is not available. */
async function containerOciOf({
	instanceAi,
}: GlobalConfig): Promise<{ oci: 'runc' | 'runsc' } | { missing: string }> {
	if (!instanceAi.nodesNextContainerEnabled) return { missing: 'container is not enabled' };
	try {
		const { stdout } = await promisify(execFile)(
			'docker',
			['info', '--format', '{{range $name, $_ := .Runtimes}}{{$name}} {{end}}'],
			{ timeout: 10_000 },
		);
		return { oci: stdout.split(/\s+/).includes('runsc') ? 'runsc' : 'runc' };
	} catch (error) {
		Container.get(Logger).warn('The container runtime is not available: docker does not answer', {
			error: ensureError(error),
		});
		return { missing: 'container is not available: docker does not answer' };
	}
}

/**
 * The host runtime of the node contracts: each contract node runs the version that its pin
 * (`INode.contract`) resolves to, in the runtime that `N8N_NODES_NEXT_RUNTIMES_*` allows for its
 * trust class. The workflow policy `meta.nodeContractsPolicy` comes from the current saved
 * workflow, also for a run of a history version. The host makes it once and gives it to every
 * contract loader.
 */
export async function nodeContractsRuntime(): Promise<HostRuntime> {
	const globalConfig = Container.get(GlobalConfig);
	const { instanceAi } = globalConfig;
	const logger = Container.get(Logger);
	const nodes = Container.get(NodesConfig);
	const [
		{ containerRuntime, pooledRuntime, wasmReuseRuntime, workerRuntime },
		{ policyExecutorLoader, warmSandbox },
		{ contractVersionLoader, credentialManifestsOf },
	] = await Promise.all([
		import('@n8n/node-sdk/runtimes'),
		import('@n8n/node-sdk/sandbox'),
		import('@n8n/node-sdk/registry'),
	]);
	const metaByExecution = new Map<string, Promise<unknown>>();

	const metaOf = async (workflowId: string | undefined) => {
		if (!workflowId) return undefined;
		const [workflow] = await Container.get(WorkflowRepository).findByIds([workflowId], {
			fields: ['meta'],
		});
		return workflow?.meta;
	};

	const tracePayloads = instanceAi.nodeContractTracePayloads;
	if (tracePayloads !== 'off') {
		Container.get(Logger).warn(
			`N8N_NODE_CONTRACT_TRACE_PAYLOADS is "${tracePayloads}": the traces of contract nodes hold the input, the output and the HTTP bodies of each run. Use it in development only.`,
		);
	}

	const lists = {
		'first-party': instanceAi.nodesNextRuntimesFirstParty,
		community: instanceAi.nodesNextRuntimesCommunity,
		private: instanceAi.nodesNextRuntimesPrivate,
	};
	const listed = new Set(Object.values(lists).flat());
	for (const origin of ['community', 'private'] as const) {
		const unbounded = lists[origin].filter((name) => name === 'in-process' || name === 'worker');
		if (unbounded.length > 0) {
			logger.warn(
				`N8N_NODES_NEXT_RUNTIMES_${origin.toUpperCase()} has ${unbounded.join(', ')}: ${origin} node code runs without a security boundary`,
			);
		}
	}
	const wasmMissing = wasmMissingOf(globalConfig);
	if (wasmMissing && listed.has('wasm')) {
		logger.warn(`The wasm runtime is not available: ${wasmMissing}`);
	}
	const container = await containerOciOf(globalConfig);
	const available: RuntimeAvailability = {
		missing: {
			...(wasmMissing && {
				wasm: 'wasm is not available: the sandbox sidecar is not installed',
			}),
			...('missing' in container && { container: container.missing }),
		},
		...('oci' in container && { containerOci: container.oci }),
	};
	const runtimes = Container.get(NodeContractsRuntimes);
	const { nodeContractSandboxSidecar: sidecar, nodeContractSandboxGuests: guests } = instanceAi;
	const cacheDir =
		instanceAi.nodeContractSandboxCacheDir ||
		path.join(Container.get(NodeContractsStore).dir, 'sandbox');
	if (!wasmMissing && listed.has('wasm')) {
		// Without the warm-up, the first run in wasm compiles the guest, so a failure only costs time.
		void warmSandbox({ sidecar, guests, cacheDir }).catch((error: unknown) =>
			logger.debug(`The sandbox guests did not compile at start: ${ensureError(error).message}`),
		);
	}

	const store = await Container.get(NodeContractsStore).open();
	const onPermissionRefused = ({ node, ...refusal }: PermissionRefusal) =>
		Container.get(EventService).emit('node-permission-refused', {
			...refusal,
			...(node ? { nodeName: node.name, nodeType: node.type } : {}),
		});
	const versionLoader = contractVersionLoader({
		policy: instanceAi.nodeContractsUpdatePolicy,
		revokedAllowed: instanceAi.nodeContractsRevokedAllow,
		permissionsDeny: nodes.permissionsDeny,
		store,
		onPermissionRefused,
		metaOf: async (context) => {
			const { id } = context.getWorkflow();
			const key = `${context.getExecutionId()}/${id ?? ''}`;
			const known = metaByExecution.get(key);
			if (known) return await known;
			const oldest = metaByExecution.keys().next();
			if (metaByExecution.size >= MAX_CACHED_EXECUTIONS && !oldest.done) {
				metaByExecution.delete(oldest.value);
			}
			const meta = metaOf(id);
			metaByExecution.set(key, meta);
			return await meta.catch((error: unknown) => {
				metaByExecution.delete(key);
				throw error;
			});
		},
	});
	const executorLoader = policyExecutorLoader(
		{
			lists,
			available,
			log: (message) => logger.debug(message),
			runtimes: {
				worker: () =>
					runtimes.get('worker', () => pooledRuntime(workerRuntime(), { size: POOL_SIZE })),
				...(!wasmMissing && {
					wasm: () => runtimes.get('wasm', () => wasmReuseRuntime({ sidecar, guests })),
				}),
				...('oci' in container && {
					container: () =>
						runtimes.get('container', () =>
							pooledRuntime(containerRuntime({ ociRuntime: container.oci }), { size: POOL_SIZE }),
						),
				}),
			},
		},
		{
			cacheDir,
			// The credential hosts and base URLs never come from a bundle.
			credentialType: sandboxCredentialTypeOf((name) =>
				Container.get(CredentialTypes).recognizes(name),
			),
		},
	);
	return hostRuntime({
		nodeContractRange: instanceAi.nodeContractRange,
		versionLoader,
		credentialManifestOf: credentialManifestsOf(store, hasOtherCredentialTypeInN8n),
		// A custom action's config is data, so n8n gives its credential types, as in the sandbox.
		credentialTypeOf: customActionCredentialTypeOf((name) =>
			Container.get(CredentialTypes).recognizes(name),
		),
		executorLoader,
		onRunProfile: ({ executionId, nodeName }, profile) =>
			Container.get(EventService).emit('node-contract-run-profiled', {
				executionId,
				nodeName,
				profile,
			}),
		tracePayloads: tracePayloads === 'off' ? undefined : tracePayloads,
		onPermissionRefused,
		egressInputHosts: nodes.egressInputHosts,
		maxResponseBytes:
			nodes.responseSizeMaxMiB === 0 ? Infinity : nodes.responseSizeMaxMiB * 1024 * 1024,
		// The Code contracts follow the same switch as the Code node.
		codeLanguages: nodes.pythonEnabled ? ['javascript', 'python'] : ['javascript'],
		// The `parsers` import uses the parsers of the Extract from File node. They load at the first read.
		fileExtractor: async (file, request) => {
			const { extractFile } = await import(
				'n8n-nodes-base/dist/nodes/Files/ExtractFromFile/extractFile.js'
			);
			return await extractFile(file, request);
		},
	});
}

/**
 * One contract loader for each first-party package, all with the one host runtime `runtime`, so
 * the node types of every package run with the same version loader, policy, listeners and
 * executor cache.
 */
export const contractNodeLoadersOf = (
	runtime: HostRuntime,
	options: {
		readonly excludeNodes: readonly string[];
		readonly includeNodes: readonly string[];
		readonly deny: readonly NodePermissionClass[];
		readonly legacyLoaders: () => Readonly<Record<string, NodeLoader>>;
	},
) =>
	firstPartyPackages().map(
		(source) =>
			new ContractNodeLoader(
				runtime,
				options.excludeNodes,
				options.includeNodes,
				undefined,
				options.deny,
				undefined,
				options.legacyLoaders,
				source,
			),
	);

/**
 * The permissions of the contract version that a node type, or its agent tool type, projects for
 * the major of a node. `undefined` for a node that is not a contract node.
 */
export function contractPermissionsOf(
	loaders: Readonly<Record<string, NodeLoader>>,
	{ type, typeVersion }: Pick<INode, 'type' | 'typeVersion'>,
) {
	const separator = type.lastIndexOf('.');
	const contracts = loaders[type.slice(0, separator)];
	if (!(contracts instanceof ContractNodeLoader)) return undefined;
	const tool = toolIdOf(type);
	const name = tool ? nodeNameOf(tool) : type.slice(separator + 1);
	const version = contracts
		.packedVersionsOf(name)
		.find(({ manifest }) => manifest.contract.version === typeVersion);
	return version && permissionsOf(version.manifest.contract);
}

/**
 * The action and the major that a node runs as a contract: a contract node type, its agent tool
 * type, or a slot of a migrated legacy node. `undefined` for any other node, and for a trigger,
 * which runs the version that its node type projects.
 */
export function contractActionOf(
	loaders: Readonly<Record<string, NodeLoader>>,
	node: Pick<INode, 'type' | 'typeVersion' | 'parameters'>,
): { readonly id: string; readonly major: number } | undefined {
	const slot = migratedSlotOf(node);
	if (slot) return { id: slot.id, major: slot.major };
	const separator = node.type.lastIndexOf('.');
	const contracts = loaders[node.type.slice(0, separator)];
	if (!(contracts instanceof ContractNodeLoader)) return undefined;
	const tool = toolIdOf(node.type);
	// Any major gives the id, also when the node type does not list the major of the node.
	const [version] = contracts.packedVersionsOf(
		tool ? nodeNameOf(tool) : node.type.slice(separator + 1),
	);
	if (!version || version.manifest.kind === 'trigger') return undefined;
	return { id: version.manifest.id, major: node.typeVersion };
}

/**
 * The nodes of a save with the pin of each contract node, see `ContractStore.pinOf`. A node
 * without a pin takes the pin of the stored node with its id and type, so a client that drops
 * the field keeps the pin. A pin that no source has stays only when it is new to this save, so
 * that a sync can fetch it; a stored one, e.g. of a HEAD that a release replaced, is re-pinned.
 * Any other node loses its pin.
 */
export async function pinnedNodesOf(
	nodes: readonly INode[],
	storedNodes: readonly INode[] = [],
): Promise<INode[]> {
	// The pin runs before the save validation, so a node may have no type yet.
	const mayPin = ({ type, contract }: INode) =>
		typeof type === 'string' &&
		(contract !== undefined || isContractNodeType(type) || type in MIGRATED_NODES);
	if (!nodes.some(mayPin)) return [...nodes];
	const { loaders } = Container.get(LoadNodesAndCredentials);
	const actions = nodes.map((node) => (mayPin(node) ? contractActionOf(loaders, node) : undefined));
	if (nodes.every((node, index) => !actions[index] && node.contract === undefined)) {
		return [...nodes];
	}
	const store = await Container.get(NodeContractsStore).open();
	const stored = new Map(storedNodes.map((node) => [node.id, node]));
	return await Promise.all(
		nodes.map(async (node, index) => {
			const action = actions[index];
			const previous = stored.get(node.id);
			const saved = previous?.type === node.type ? previous.contract : undefined;
			const current = node.contract ?? saved;
			const keepUnknown = current?.digest !== saved?.digest;
			const pin = action && (await store.pinOf(action.id, action.major, current, { keepUnknown }));
			if (pin === node.contract) return node;
			const { contract: _, ...rest } = node;
			return pin ? { ...rest, contract: pin } : rest;
		}),
	);
}

/**
 * The host imports of the contract version that a node type projects for the major of a node,
 * e.g. `dataTables`. Empty for a node that is not a contract node.
 */
export const contractImportsOf = (
	loaders: Readonly<Record<string, NodeLoader>>,
	node: Pick<INode, 'type' | 'typeVersion'>,
): readonly string[] => contractPermissionsOf(loaders, node)?.imports ?? [];

/** The contract loader of the package of an id, when n8n loads it. */
function contractLoaderOf(loaders: Readonly<Record<string, NodeLoader>>, id: string) {
	const loader = loaders[packageNameOf(id)];
	return loader instanceof ContractNodeLoader ? loader : undefined;
}

/** The legacy node of a full node type, when its loader has it and it has versions. */
function versionedNodeOf(loaders: Readonly<Record<string, NodeLoader>>, nodeType: string) {
	const separator = nodeType.lastIndexOf('.');
	const loader = loaders[nodeType.slice(0, separator)];
	const name = nodeType.slice(separator + 1);
	if (!loader || !(name in loader.known.nodes)) return undefined;
	const loaded = loader.getNode(name);
	return 'nodeVersions' in loaded.type ? { ...loaded, type: loaded.type } : undefined;
}

/**
 * The agent tool node types of the actions, e.g. `@n8n/nodes-core.httpRequestGetTool`. The
 * host generates them as the tool variants of legacy nodes, with the same description changes.
 * A tool supplies the action itself, so the tool schema is the action input schema.
 */
function toolNodesOf(loaders: Readonly<Record<string, NodeLoader>>, runtime: HostRuntime) {
	return toolEntries().flatMap(({ manifest: { id }, nodeType: actionType, toolType }) => {
		const base = versionedNodeOf(loaders, actionType);
		const versions = contractLoaderOf(loaders, id)?.packedVersionsOf(nodeNameOf(id)) ?? [];
		if (!base || !toolType || versions.length === 0) return [];
		const nodeType = toolType;
		const presentation = presentationOf(base.type.getNodeType().description);
		const describe = (description: INodeTypeDescription): INodeTypeDescription => ({
			...convertNodeToAiTool({ description: deepCopy(presented(description, presentation)) })
				.description,
			name: nodeType,
		});
		const type = new (toVersionedToolType(versions, describe, runtime))();
		return [[nodeType, { sourcePath: base.sourcePath, type }] as const];
	});
}

/**
 * Adds the composed versions of legacy nodes, for example Notion v4, and the agent tool node
 * types of actions to the node classes and to the types that the editor reads. The nodes panel
 * lists a contract node type only under its legacy node item. It does not list the other contract
 * node types, but the AI builder and saved workflows can use them.
 */
export function composeContractNodes(
	loaders: Readonly<Record<string, NodeLoader>>,
	types: readonly INodeTypeDescription[],
) {
	// The slots run the versions that the contract loader loads, so its settings apply to them too.
	const loadedVersionsOf = (actionId: string) =>
		contractLoaderOf(loaders, actionId)?.packedVersionsOf(nodeNameOf(actionId)) ?? [];
	// Every contract loader has the one host runtime of the host.
	const runtime = Object.values(loaders).find(
		(loader): loader is ContractNodeLoader => loader instanceof ContractNodeLoader,
	)?.runtime;
	const nodes = new Map<string, LoadedClass<IVersionedNodeType>>(
		runtime
			? [
					...toolNodesOf(loaders, runtime),
					...Object.keys(MIGRATED_NODES).flatMap((nodeType) => {
						const legacy = versionedNodeOf(loaders, nodeType);
						if (!legacy) return [];
						const composed: LoadedClass<IVersionedNodeType> = {
							...legacy,
							type: withMigratedVersions(nodeType, legacy.type, loadedVersionsOf, runtime),
						};
						return [[nodeType, composed] as const];
					}),
				]
			: [],
	);
	// A copy, because later steps add options to the properties of the newest version.
	const added = [...nodes].flatMap(([name, { type }]) =>
		Object.keys(MIGRATED_NODES[name] ?? {})
			.filter((version) => version in type.nodeVersions)
			.map(
				(version): INodeTypeDescription => ({
					...deepCopy(type.getNodeType(Number(version)).description),
					name,
				}),
			),
	);
	const patched = types.map((description): INodeTypeDescription => {
		const defaultVersion =
			description.name in MIGRATED_NODES
				? nodes.get(description.name)?.type.description.defaultVersion
				: undefined;
		if (defaultVersion !== undefined) return { ...description, defaultVersion };
		if (!isContractNodeType(description.name)) return description;
		// The AI tools copy the item of the action to its tool variant, which the panel lists apart.
		const { nodeCreatorItem, ...unlisted } = description;
		// A custom action has its app instead of an item, see `customDescriptionOf`.
		const listed = nodeCreatorItem !== undefined || description.codex?.app !== undefined;
		return listed && !isToolType(description.name) ? description : { ...unlisted, hidden: true };
	});
	return { nodes, types: [...patched, ...added] };
}

/** What the editor shows of a replaced credential type when the contract type has none. */
const PRESENTATION = ['icon', 'iconColor', 'iconUrl', 'httpRequestNode'] as const;

/**
 * A credential type of a contract package replaces the type of the same name from another
 * package, for example `notionApi` of n8n-nodes-base, so legacy nodes sign with the contract type
 * too. The caller lists the types of the contract packages last. The replacement keeps the
 * supported nodes of both, and the icon and HTTP Request settings of the replaced type when it
 * has none.
 */
export function preferContractCredentials(
	loaders: Readonly<Record<string, NodeLoader>>,
	known: KnownNodesAndCredentials['credentials'],
	types: readonly ICredentialType[],
) {
	const own = Object.values(loaders).flatMap((loader) =>
		loader instanceof ContractNodeLoader ? Object.keys(loader.known.credentials) : [],
	);
	const replaced = new Map(
		own.flatMap((name) => {
			const entries = types.filter((type) => type.name === name);
			const contract = entries.at(-1);
			if (!contract || entries.length < 2) return [];
			const supportedNodes = [...new Set(entries.flatMap((entry) => entry.supportedNodes ?? []))];
			const presentation = PRESENTATION.flatMap((key) => {
				const value = entries.map((entry) => entry[key]).findLast((v) => v !== undefined);
				return value === undefined ? [] : [[key, value] as const];
			});
			const merged: ICredentialType = {
				...contract,
				...Object.fromEntries(presentation),
				supportedNodes,
			};
			return [[name, { merged, contract }] as const];
		}),
	);
	return {
		known: Object.fromEntries(
			Object.entries(known).map(([name, entry]) => {
				const supportedNodes = replaced.get(name)?.merged.supportedNodes;
				// A copy: the AI tools add their variants to the known entry only, as for legacy types.
				return [name, supportedNodes ? { ...entry, supportedNodes: [...supportedNodes] } : entry];
			}),
		),
		types: types.flatMap((type) => {
			const entry = replaced.get(type.name);
			if (!entry) return [type];
			return type === entry.contract ? [entry.merged] : [];
		}),
	};
}
