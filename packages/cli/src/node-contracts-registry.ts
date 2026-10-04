import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { EventService } from '@n8n/backend-services';
import {
	GlobalConfig,
	NODE_PERMISSION_CLASSES,
	NodesConfig,
	type NodePermissionClass,
} from '@n8n/config';
import {
	NodeContractStatusRepository,
	NodeContractVersionRepository,
	WorkflowRepository,
	type NodeContractManifestRow,
} from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import {
	bundledCredentialsOf,
	bundledIdsOf,
	credentialTypeOfManifest,
	EMBEDDED_STORE_DIR,
	isStoreStatusRecord,
	MIGRATED_NODES,
	NODE_PACKAGE,
	nodeNameOf,
	nodeTypeOf,
	permissionsOf,
	runsNodeContract,
	storeIndexFileOf,
	toolActionOfNode,
	toolActions,
	toolTypeOf,
	toVersionedNodeType,
	toVersionedToolType,
	toVersionedTriggerType,
	versionsOf,
	withMigratedVersions,
	type ContractKeys,
	type ContractStore,
	type CredentialManifest,
	type FrozenVersion,
	type InstanceStore,
	type StoreStatusRecord,
} from '@n8n/nodes-base-next';
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
	jsonParse,
	UserError,
	type VersionedNodeType,
	type ICredentialType,
	type ICredentialTypeData,
	type INode,
	type INodeTypeDescription,
	type KnownNodesAndCredentials,
	type IVersionedNodeType,
	type LoadedClass,
	type NodeLoader,
} from 'n8n-workflow';
import path from 'path';

import { CredentialTypes } from '@/credential-types';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { convertNodeToAiTool } from '@/tool-generation';

// Recent executions only; a contract node reads the meta of its own execution.
const MAX_CACHED_EXECUTIONS = 100;

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

	/** The rows of the table. */
	readonly rows: InstanceStore = {
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

	/** The store with the configured registry, or with `registryUrl`. */
	async open(registryUrl = this.globalConfig.instanceAi.nodeContractsRegistryUrl) {
		const known = this.stores.get(registryUrl);
		if (known) return await known;
		const opened = this.create(registryUrl);
		this.stores.set(registryUrl, opened);
		return await opened;
	}

	private async create(registryUrl: string) {
		const { contractStore } = await import('@n8n/nodes-base-next');
		return contractStore({
			registryUrl,
			keys: await this.keys(),
			store: this.rows,
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
type StoredContracts = Pick<ContractStore, 'versions' | 'credentials'>;

const openContractStore = async (): Promise<StoredContracts> =>
	await Container.get(NodeContractsStore).open();

/** Whether a package other than the node contracts has a credential type of this name. */
const hasOtherCredentialTypeInN8n = (name: string) =>
	Object.values(Container.get(LoadNodesAndCredentials).loaders).some(
		(loader) => loader.packageName !== NODE_PACKAGE && name in loader.known.credentials,
	);

const majorOf = ({ manifest }: FrozenVersion) => manifest.contract.version;

/** The `N8N_NODE_PERMISSIONS_DENY` classes of the permissions of a contract, e.g. for the security audit. */
export function permissionClassesOf({
	egress,
	imports,
}: Pick<ReturnType<typeof permissionsOf>, 'egress' | 'imports'>) {
	// No contract has a files capability yet, and a contract node is never a legacy community node.
	const has: Record<NodePermissionClass, boolean> = {
		'egress-input': egress.fromInput !== undefined,
		code: imports.includes('code'),
		files: false,
		'full-community': false,
	};
	return NODE_PERMISSION_CLASSES.filter((name) => has[name]);
}

/** The first class of `deny` that the contract of a version has. */
function deniedClassOf({ manifest }: FrozenVersion, deny: readonly NodePermissionClass[]) {
	const classes = permissionClassesOf(permissionsOf(manifest.contract));
	return deny.find((name) => classes.includes(name));
}

/** One node type of the contract loader and the frozen versions it projects. */
interface ContractNode extends LoadedClass<VersionedNodeType> {
	readonly versions: readonly FrozenVersion[];
}

/** The node type of the frozen versions of one id, with the parameters n8n adds to every node. */
function contractNodeTypeOf(versions: readonly FrozenVersion[]) {
	const typeOf =
		versions[0]?.manifest.kind === 'trigger' ? toVersionedTriggerType : toVersionedNodeType;
	const type = new (typeOf(versions))();
	for (const version of Object.values(type.nodeVersions)) {
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
 * The node and credential types of node contracts, from manifests only: one versioned node type
 * for each id with the bundled HEAD and the stored versions of its other majors, and the bundled
 * credential manifests with the stored ones of other names. The type names keep the package name
 * as prefix.
 */
export class ContractNodeLoader implements NodeLoader {
	readonly packageName = NODE_PACKAGE;

	known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	types: Types = { nodes: [], credentials: [] };

	private nodes: ReadonlyMap<string, ContractNode> = new Map();

	private credentialTypes: ICredentialTypeData = {};

	private typesReleased = false;

	/**
	 * `excludeNodes` and `includeNodes` hold full node type names, as `N8N_NODES_EXCLUDE` does.
	 * `deny` holds the permission classes of `N8N_NODE_PERMISSIONS_DENY`.
	 */
	constructor(
		private readonly excludeNodes: readonly string[] = [],
		private readonly includeNodes: readonly string[] = [],
		private readonly openStore: () => Promise<StoredContracts> = openContractStore,
		private readonly deny: readonly NodePermissionClass[] = [],
		private readonly hasOtherCredentialType = hasOtherCredentialTypeInN8n,
	) {}

	async loadAll() {
		const [stored, storedCredentials] = await Promise.all([
			this.fromStore(async (store) => await store.versions(), new Map()),
			this.fromStore(async (store) => await store.credentials(), new Map()),
		]);
		const bundled = new Set(bundledIdsOf());
		this.nodes = new Map(
			[...new Set([...bundled, ...stored.keys()])].filter(this.loads).flatMap((id) => {
				const head = bundled.has(id) ? versionsOf(id) : [];
				const majors = new Set(head.map(majorOf));
				const versions = [
					...head,
					...(stored.get(id) ?? []).filter(
						(version) =>
							!majors.has(majorOf(version)) && runsNodeContract(version.manifest.nodeContract),
					),
				].filter(this.permits);
				if (versions.length === 0) return [];
				const sourcePath = bundled.has(id)
					? path.join(EMBEDDED_STORE_DIR, storeIndexFileOf(id))
					: Container.get(NodeContractsStore).dir;
				const node: ContractNode = { type: contractNodeTypeOf(versions), sourcePath, versions };
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
	}

	/** The frozen versions that the node type of a node name projects. */
	frozenVersionsOf(name: string): readonly FrozenVersion[] {
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
	 * The bundled credential manifests, and the stored ones of names that n8n does not bundle,
	 * e.g. a type that a stored version pins. A stored type never replaces the type of another
	 * package, e.g. a legacy class. A stored type that n8n cannot project is skipped.
	 */
	private credentialManifestsOf(stored: ReadonlyMap<string, CredentialManifest>) {
		const bundled = bundledCredentialsOf();
		const names = new Set(bundled.map(({ manifest }) => manifest.name));
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
	private readonly permits = (version: FrozenVersion) => {
		const denied = deniedClassOf(version, this.deny);
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
		const nodeType = `${NODE_PACKAGE}.${nodeNameOf(id)}`;
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

/**
 * Lets each contract node run the version that the lock in `meta.nodeContracts` resolves to.
 * Known limit: the lock comes from the saved workflow. An execution of an unsaved change or
 * of a published history version uses the meta of the current saved workflow.
 */
export async function useNodeContractsRegistry() {
	const { instanceAi } = Container.get(GlobalConfig);
	const { sandboxCredentialTypeOf, setCodeLanguages, useContractRegistry } = await import(
		'@n8n/nodes-base-next'
	);
	const nodes = Container.get(NodesConfig);
	// The Code contracts follow the same switch as the Code node.
	setCodeLanguages(nodes.pythonEnabled ? ['javascript', 'python'] : ['javascript']);
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

	const scope = instanceAi.nodeContractSandbox;
	const sandbox =
		scope === 'off'
			? undefined
			: {
					scope,
					options: {
						...sandboxFilesOf(instanceAi),
						cacheDir:
							instanceAi.nodeContractSandboxCacheDir ||
							path.join(Container.get(NodeContractsStore).dir, 'sandbox'),
						// The credential hosts and base URLs never come from a bundle.
						credentialType: sandboxCredentialTypeOf((name) =>
							Container.get(CredentialTypes).recognizes(name),
						),
					},
				};

	useContractRegistry({
		policy: instanceAi.nodeContractsUpdatePolicy,
		revokedAllowed: instanceAi.nodeContractsRevokedAllow,
		nodeContractRange: instanceAi.nodeContractRange,
		sandbox,
		egressInputHosts: nodes.egressInputHosts,
		maxResponseBytes:
			nodes.responseSizeMaxMiB === 0 ? Infinity : nodes.responseSizeMaxMiB * 1024 * 1024,
		hasOtherCredentialType: hasOtherCredentialTypeInN8n,
		store: await Container.get(NodeContractsStore).open(),
		tracePayloads: tracePayloads === 'off' ? undefined : tracePayloads,
		onRunProfile: ({ executionId, nodeName }, profile) =>
			Container.get(EventService).emit('node-contract-run-profiled', {
				executionId,
				nodeName,
				profile,
			}),
		onPermissionRefused: ({ node, ...refusal }) =>
			Container.get(EventService).emit('node-permission-refused', {
				...refusal,
				...(node ? { nodeName: node.name, nodeType: node.type } : {}),
			}),
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
}

/** The sidecar and the guests of the sandbox. A missing file stops the start: no bundle may run unsandboxed. */
function sandboxFilesOf(instanceAi: GlobalConfig['instanceAi']) {
	const sidecar = instanceAi.nodeContractSandboxSidecar;
	const guests = instanceAi.nodeContractSandboxGuests;
	const files = [
		sidecar,
		...['action.wasm', 'provider.wasm', 'trigger.wasm'].map((guest) => path.join(guests, guest)),
	];
	const missing = !sidecar || !guests ? files : files.filter((file) => !existsSync(file));
	if (missing.length > 0) {
		throw new UserError(
			`N8N_NODE_CONTRACT_SANDBOX is ${instanceAi.nodeContractSandbox}, and the sandbox files are missing: ${missing.join(', ')}. Set N8N_NODE_CONTRACT_SANDBOX_SIDECAR and N8N_NODE_CONTRACT_SANDBOX_GUESTS.`,
		);
	}
	return { sidecar, guests };
}

/**
 * The permissions of the contract version that a node type, or its agent tool type, projects for
 * the major of a node. `undefined` for a node that is not a contract node.
 */
export function contractPermissionsOf(
	loaders: Readonly<Record<string, NodeLoader>>,
	{ type, typeVersion }: Pick<INode, 'type' | 'typeVersion'>,
) {
	const contracts = loaders[NODE_PACKAGE];
	if (!(contracts instanceof ContractNodeLoader) || !type.startsWith(`${NODE_PACKAGE}.`)) {
		return undefined;
	}
	const tool = toolActionOfNode({ type });
	const name = tool ? nodeNameOf(tool.id) : type.slice(NODE_PACKAGE.length + 1);
	const version = contracts
		.frozenVersionsOf(name)
		.find(({ manifest }) => manifest.contract.version === typeVersion);
	return version && permissionsOf(version.manifest.contract);
}

/**
 * The host imports of the contract version that a node type projects for the major of a node,
 * e.g. `dataTables`. Empty for a node that is not a contract node.
 */
export const contractImportsOf = (
	loaders: Readonly<Record<string, NodeLoader>>,
	node: Pick<INode, 'type' | 'typeVersion'>,
): readonly string[] => contractPermissionsOf(loaders, node)?.imports ?? [];

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
 * The agent tool node types of the actions, e.g. `@n8n/nodes-base-next.httpRequestGetTool`. The
 * host generates them as the tool variants of legacy nodes, with the same description changes.
 * A tool supplies the action itself, so the tool schema is the action input schema.
 */
function toolNodesOf(loaders: Readonly<Record<string, NodeLoader>>) {
	const contracts = loaders[NODE_PACKAGE];
	if (!(contracts instanceof ContractNodeLoader)) return [];
	return toolActions.flatMap((action) => {
		const base = versionedNodeOf(loaders, nodeTypeOf(action));
		const versions = contracts.frozenVersionsOf(nodeNameOf(action.id));
		if (!base || versions.length === 0) return [];
		const nodeType = toolTypeOf(action);
		const describe = (description: INodeTypeDescription): INodeTypeDescription => ({
			...convertNodeToAiTool({ description: deepCopy(description) }).description,
			name: nodeType,
		});
		const type = new (toVersionedToolType(versions, describe))();
		return [[nodeType, { sourcePath: base.sourcePath, type }] as const];
	});
}

/**
 * Adds the composed versions of legacy nodes, for example Notion v4, and the agent tool node
 * types of actions to the node classes and to the types that the editor reads. The node type of
 * each single action stays for the AI builder and saved workflows, but the nodes panel no
 * longer lists it.
 */
export function composeContractNodes(
	loaders: Readonly<Record<string, NodeLoader>>,
	types: readonly INodeTypeDescription[],
) {
	const nodes = new Map<string, LoadedClass<IVersionedNodeType>>([
		...toolNodesOf(loaders),
		...Object.keys(MIGRATED_NODES).flatMap((nodeType) => {
			const legacy = versionedNodeOf(loaders, nodeType);
			if (!legacy) return [];
			const composed: LoadedClass<IVersionedNodeType> = {
				...legacy,
				type: withMigratedVersions(nodeType, legacy.type),
			};
			return [[nodeType, composed] as const];
		}),
	]);
	// A copy, because later steps add options to the properties of the newest version.
	const added = [...nodes].flatMap(([name, { type }]) =>
		Object.keys(MIGRATED_NODES[name] ?? {}).map(
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
		return description.name.startsWith(`${NODE_PACKAGE}.`)
			? { ...description, hidden: true }
			: description;
	});
	return { nodes, types: [...patched, ...added] };
}

/** What the editor shows of a replaced credential type when the contract type has none. */
const PRESENTATION = ['icon', 'iconColor', 'iconUrl', 'httpRequestNode'] as const;

/**
 * A credential type of this package replaces the type of the same name from another package, for
 * example `notionApi` of n8n-nodes-base, so legacy nodes sign with the contract type too. The
 * caller lists the types of this package last. The replacement keeps the supported nodes of
 * both, and the icon and HTTP Request settings of the replaced type when it has none.
 */
export function preferContractCredentials(
	loaders: Readonly<Record<string, NodeLoader>>,
	known: KnownNodesAndCredentials['credentials'],
	types: readonly ICredentialType[],
) {
	const own = Object.keys(loaders[NODE_PACKAGE]?.known.credentials ?? {});
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
