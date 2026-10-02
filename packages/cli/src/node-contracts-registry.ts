import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig, NodesConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { readFile } from 'fs/promises';
import {
	actions,
	MIGRATED_NODES,
	NODE_PACKAGE,
	nodeTypeOf,
	runsNodeContract,
	toolActions,
	toolTypeOf,
	toVersionedNodeType,
	toVersionedToolType,
	toVersionedTriggerType,
	triggers,
	versionsOf,
	withMigratedVersions,
	type ContractStore,
	type FrozenVersion,
} from '@n8n/nodes-base-next';
import { InstanceSettings } from 'n8n-core';
import {
	deepCopy,
	VersionedNodeType,
	type ICredentialType,
	type INodeTypeDescription,
	type KnownNodesAndCredentials,
	type IVersionedNodeType,
	type LoadedClass,
	type NodeLoader,
} from 'n8n-workflow';
import path from 'path';

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
export async function storedContractVersions(): Promise<
	ReadonlyMap<string, readonly FrozenVersion[]>
> {
	const store = await Container.get(NodeContractsStore).open();
	return await store.versions();
}

/**
 * Lets each contract node run the version that the lock in `meta.nodeContracts` resolves to.
 * Known limit: the lock comes from the saved workflow. An execution of an unsaved change or
 * of a published history version uses the meta of the current saved workflow.
 */
export async function useNodeContractsRegistry() {
	const { instanceAi } = Container.get(GlobalConfig);
	const { setCodeLanguages, useContractRegistry } = await import('@n8n/nodes-base-next');
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

	useContractRegistry({
		policy: instanceAi.nodeContractsUpdatePolicy,
		nodeContractRange: instanceAi.nodeContractRange,
		store: await Container.get(NodeContractsStore).open(),
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
 * Adds the stored majors of each action and trigger node. n8n bundles only the HEAD, so a
 * workflow on an older major needs the stored version to render and to run.
 */
function withStoredMajors(
	loaders: Readonly<Record<string, NodeLoader>>,
	stored: ReadonlyMap<string, readonly FrozenVersion[]>,
) {
	const contracts = [
		...actions.map((contract) => ({ contract, typeOf: toVersionedNodeType })),
		...triggers.map((contract) => ({ contract, typeOf: toVersionedTriggerType })),
	];
	return contracts.flatMap(({ contract, typeOf }) => {
		const others = otherMajorsOf(contract, stored);
		const nodeType = nodeTypeOf(contract);
		const head = others.length > 0 ? versionedNodeOf(loaders, nodeType) : undefined;
		if (!head) return [];
		const { nodeVersions } = new (typeOf(others))();
		// The loaded HEAD keeps its description and default version.
		const type = new VersionedNodeType(
			{ ...nodeVersions, ...head.type.nodeVersions },
			head.type.description,
		);
		const descriptions = others.map(
			({ manifest }): INodeTypeDescription => ({
				...manifest.description,
				name: nodeType,
				codex: head.type.description.codex,
			}),
		);
		return [{ nodeType, loaded: { ...head, type }, descriptions }];
	});
}

/** The stored majors of an action that the bundled HEAD does not have. */
const otherMajorsOf = (
	contract: { readonly id: string; readonly version: number },
	stored: ReadonlyMap<string, readonly FrozenVersion[]>,
) =>
	(stored.get(contract.id) ?? []).filter(
		({ manifest }) =>
			manifest.contract.version !== contract.version && runsNodeContract(manifest.nodeContract),
	);

/**
 * The agent tool node types of the actions, e.g. `@n8n/nodes-base-next.httpRequestGetTool`. The
 * host generates them as the tool variants of legacy nodes, with the same description changes.
 * A tool supplies the action itself, so the tool schema is the action input schema.
 */
function toolNodesOf(
	loaders: Readonly<Record<string, NodeLoader>>,
	stored: ReadonlyMap<string, readonly FrozenVersion[]>,
) {
	return toolActions.flatMap((action) => {
		const base = versionedNodeOf(loaders, nodeTypeOf(action));
		if (!base) return [];
		const nodeType = toolTypeOf(action);
		const describe = (description: INodeTypeDescription): INodeTypeDescription => ({
			...convertNodeToAiTool({ description: deepCopy(description) }).description,
			name: nodeType,
		});
		const versions = [...versionsOf(action.id), ...otherMajorsOf(action, stored)];
		const type = new (toVersionedToolType(versions, describe))();
		return [[nodeType, { sourcePath: base.sourcePath, type }] as const];
	});
}

/**
 * Adds the composed versions of legacy nodes, for example Notion v4, and the stored majors of
 * action nodes to the node classes and to the types that the editor reads. The node type of
 * each single action stays for the AI builder and saved workflows, but the nodes panel no
 * longer lists it.
 */
export function composeContractNodes(
	loaders: Readonly<Record<string, NodeLoader>>,
	types: readonly INodeTypeDescription[],
	stored: ReadonlyMap<string, readonly FrozenVersion[]> = new Map(),
) {
	const majors = withStoredMajors(loaders, stored);
	const nodes = new Map<string, LoadedClass<IVersionedNodeType>>([
		...majors.map(({ nodeType, loaded }) => [nodeType, loaded] as const),
		...toolNodesOf(loaders, stored),
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
	const patched = [...types, ...majors.flatMap(({ descriptions }) => descriptions)].map(
		(description): INodeTypeDescription => {
			const defaultVersion =
				description.name in MIGRATED_NODES
					? nodes.get(description.name)?.type.description.defaultVersion
					: undefined;
			if (defaultVersion !== undefined) return { ...description, defaultVersion };
			return description.name.startsWith(`${NODE_PACKAGE}.`)
				? { ...description, hidden: true }
				: description;
		},
	);
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
