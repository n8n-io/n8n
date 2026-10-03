import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { EventService } from '@n8n/backend-services';
import { GlobalConfig, NodesConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { readFile } from 'fs/promises';
import {
	bundledCredentialsOf,
	bundledIdsOf,
	credentialTypeOfManifest,
	MIGRATED_NODES,
	NODE_PACKAGE,
	nodeNameOf,
	nodeTypeOf,
	runsNodeContract,
	toolActions,
	toolTypeOf,
	toVersionedNodeType,
	toVersionedToolType,
	toVersionedTriggerType,
	versionsOf,
	VERSIONS_DIR,
	withMigratedVersions,
	type ContractStore,
	type FrozenVersion,
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
	UserError,
	type VersionedNodeType,
	type ICredentialType,
	type ICredentialTypeData,
	type INodeTypeDescription,
	type KnownNodesAndCredentials,
	type IVersionedNodeType,
	type LoadedClass,
	type NodeLoader,
} from 'n8n-workflow';
import path from 'path';

import { CredentialTypes } from '@/credential-types';
import { convertNodeToAiTool } from '@/tool-generation';

// Recent executions only; a contract node reads the meta of its own execution.
const MAX_CACHED_EXECUTIONS = 100;

/** The action versions that n8n does not bundle, in `<n8nFolder>/node-contracts/`. */
@Service()
export class NodeContractsStore {
	private readonly stores = new Map<string, Promise<ContractStore>>();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	get dir() {
		return path.join(this.instanceSettings.n8nFolder, 'node-contracts');
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
		const publicKeyFile = this.globalConfig.instanceAi.nodeContractsPublicKeyFile;
		return contractStore({
			registryUrl,
			publicKey: publicKeyFile ? await readFile(publicKeyFile, 'utf8') : undefined,
			storeDir: this.dir,
			// The registry URL is operator config, not user input, so the SSRF policy does not apply.
			fetch: async (url, init) =>
				await Container.get(OutboundHttp)
					.transport({ useDefaultSsrfPolicy: 'unsafe' })
					.asCustomFetch()(url, init),
		});
	}
}

/** The newest stored version of each major, by action id. */
async function storedContractVersions(): Promise<ReadonlyMap<string, readonly FrozenVersion[]>> {
	const store = await Container.get(NodeContractsStore).open();
	return await store.versions();
}

const majorOf = ({ manifest }: FrozenVersion) => manifest.contract.version;

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
		// A copy: the store caches its manifests, and the next step adds parameters.
		version.description = deepCopy(version.description);
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
 * credential manifests. The type names keep the package name as prefix.
 */
export class ContractNodeLoader implements NodeLoader {
	readonly packageName = NODE_PACKAGE;

	known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	types: Types = { nodes: [], credentials: [] };

	private nodes: ReadonlyMap<string, ContractNode> = new Map();

	private credentialTypes: ICredentialTypeData = {};

	private typesReleased = false;

	/** `excludeNodes` and `includeNodes` hold full node type names, as `N8N_NODES_EXCLUDE` does. */
	constructor(
		private readonly excludeNodes: readonly string[] = [],
		private readonly includeNodes: readonly string[] = [],
		private readonly storedVersions = storedContractVersions,
	) {}

	async loadAll() {
		const stored = await this.storedVersions().catch((error: unknown) => {
			Container.get(Logger).error('Cannot read the node contracts store', {
				error: ensureError(error),
			});
			return new Map<string, readonly FrozenVersion[]>();
		});
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
				];
				if (versions.length === 0) return [];
				const sourcePath = bundled.has(id)
					? path.join(VERSIONS_DIR, id, 'manifest.json')
					: Container.get(NodeContractsStore).dir;
				const node: ContractNode = { type: contractNodeTypeOf(versions), sourcePath, versions };
				return [[nodeNameOf(id), node] as const];
			}),
		);
		const credentials = bundledCredentialsOf().map(({ file, manifest }) => {
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
	// The Code contracts follow the same switch as the Code node.
	setCodeLanguages(
		Container.get(NodesConfig).pythonEnabled ? ['javascript', 'python'] : ['javascript'],
	);
	const metaByExecution = new Map<string, Promise<unknown>>();

	const metaOf = async (workflowId: string | undefined) => {
		if (!workflowId) return undefined;
		const [workflow] = await Container.get(WorkflowRepository).findByIds([workflowId], {
			fields: ['meta'],
		});
		return workflow?.meta;
	};

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
						// The credential hosts and base URLs come from n8n, never from a bundle.
						credentialType: sandboxCredentialTypeOf((name) =>
							Container.get(CredentialTypes).recognizes(name),
						),
					},
				};

	useContractRegistry({
		policy: instanceAi.nodeContractsUpdatePolicy,
		nodeContractRange: instanceAi.nodeContractRange,
		sandbox,
		store: await Container.get(NodeContractsStore).open(),
		onRunProfile: ({ executionId, nodeName }, profile) =>
			Container.get(EventService).emit('node-contract-run-profiled', {
				executionId,
				nodeName,
				profile,
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
	const files = [sidecar, path.join(guests, 'action.wasm'), path.join(guests, 'provider.wasm')];
	const missing = !sidecar || !guests ? files : files.filter((file) => !existsSync(file));
	if (missing.length > 0) {
		throw new UserError(
			`N8N_NODE_CONTRACT_SANDBOX is ${instanceAi.nodeContractSandbox}, and the sandbox files are missing: ${missing.join(', ')}. Set N8N_NODE_CONTRACT_SANDBOX_SIDECAR and N8N_NODE_CONTRACT_SANDBOX_GUESTS.`,
		);
	}
	return { sidecar, guests };
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
