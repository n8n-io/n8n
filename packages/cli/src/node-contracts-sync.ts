import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import {
	isNodeContractPin,
	syncContractStore,
	type ContractStore,
	type ContractSyncResult,
	type PinnedNode,
	type VersionManifest,
} from '@n8n/node-sdk/registry';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { InstanceSettings } from 'n8n-core';
import {
	UserError,
	type INode,
	type INodeContractPin,
	type IWorkflowBase,
	type NodeLoader,
} from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { isContractNodeType, nodeTypeOf } from '@/node-contracts-catalog';
import { contractActionOf, NodeContractsStore } from '@/node-contracts-registry';

const PAGE_SIZE = 100;
const NO_RESULT: ContractSyncResult = { added: [], failed: [], unsupported: [] };

/** The contract nodes of `nodes` that have a pin, with their action. */
const pinnedOf = (loaders: Readonly<Record<string, NodeLoader>>, nodes: readonly INode[]) =>
	nodes.flatMap((node) => {
		const action = contractActionOf(loaders, node);
		return action && isNodeContractPin(node.contract)
			? [{ node, action: action.id, pin: node.contract }]
			: [];
	});

const merge = (a: ContractSyncResult, b: ContractSyncResult): ContractSyncResult => ({
	added: [...a.added, ...b.added],
	failed: [...a.failed, ...b.failed],
	unsupported: [...a.unsupported, ...b.unsupported],
});

export interface NodeContractsSyncOptions {
	/** The registry to fetch from. Default: the configured registry. Empty: the store only. */
	readonly registryUrl?: string;
	/** Rebuilds the node types when the store gets a major that no node type lists. */
	readonly refreshNodeTypes: boolean;
}

/**
 * Puts the versions that the nodes of saved workflows and of their published versions pin into
 * the node contracts store. n8n ships only the HEAD of each action, so an older pinned version
 * comes from the registry.
 */
@Service()
export class NodeContractsSync {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeContractsStore: NodeContractsStore,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

	/**
	 * Starts the sync in the background on the leader main: one pass at start and one catch-up
	 * pass on leader takeover. Startup does not wait for it, and a failure only logs.
	 */
	@OnLeaderTakeover()
	start() {
		if (!this.instanceSettings.isLeader) return;
		void this.run({ refreshNodeTypes: true }).catch((error: unknown) => {
			this.logger.error('The node contracts sync failed', { error: ensureError(error) });
		});
	}

	/** Syncs one page of workflows at a time: published workflows first, then the rest. */
	async run(options: NodeContractsSyncOptions): Promise<ContractSyncResult> {
		const store = await this.nodeContractsStore.open(options.registryUrl);
		const since = Date.now();
		const published = await this.syncPages(store, options, since, true, undefined);
		const result = merge(published, await this.syncPages(store, options, since, false, undefined));
		if (result.added.length > 0) await this.nodeContractsStore.reloadOtherMains();
		return result;
	}

	private async syncPages(
		store: ContractStore,
		options: NodeContractsSyncOptions,
		since: number,
		published: boolean,
		afterId: string | undefined,
	): Promise<ContractSyncResult> {
		const { nodes, next } = await this.pinnedPage(published, afterId);
		const result = nodes.length > 0 ? await syncContractStore(store, nodes, since) : NO_RESULT;
		this.report(result);
		const newMajor = () => !this.listsAll(result.added, store.runsNodeContract);
		if (options.refreshNodeTypes && newMajor()) {
			await this.loadNodesAndCredentials.refreshNodeTypes(newMajor);
		}
		if (next === undefined) return result;
		return merge(result, await this.syncPages(store, options, since, published, next));
	}

	/**
	 * The pinned nodes of one page of workflows, of the draft and of the published version, and
	 * the id that the next page starts after.
	 */
	private async pinnedPage(published: boolean, afterId: string | undefined) {
		const workflows = await this.workflowRepository.findNodeContractNodesPage({
			published,
			afterId,
			take: PAGE_SIZE,
		});
		const { loaders } = this.loadNodesAndCredentials;
		const nodes = workflows.flatMap(({ id, name, nodes: draft, activeVersion }) => {
			const all = pinnedOf(loaders, [...draft, ...(activeVersion?.nodes ?? [])]);
			return all
				.filter(
					({ node, pin }, index) =>
						all.findIndex(
							(other) => other.node.name === node.name && other.pin.digest === pin.digest,
						) === index,
				)
				.map(
					({ node, action, pin }): PinnedNode => ({
						workflowId: id,
						workflowName: name,
						node: node.name,
						action,
						pin,
					}),
				);
		});
		const last = workflows.at(-1);
		return { nodes, next: workflows.length < PAGE_SIZE ? undefined : last?.id };
	}

	/** The pinned nodes of all saved workflows and of their published versions. */
	async pinnedNodes(): Promise<PinnedNode[]> {
		return [
			...(await this.pinnedNodesOfPages(true, undefined)),
			...(await this.pinnedNodesOfPages(false, undefined)),
		];
	}

	private async pinnedNodesOfPages(
		published: boolean,
		afterId: string | undefined,
	): Promise<PinnedNode[]> {
		const { nodes, next } = await this.pinnedPage(published, afterId);
		if (next === undefined) return nodes;
		return [...nodes, ...(await this.pinnedNodesOfPages(published, next))];
	}

	private report({ added, failed, unsupported }: ContractSyncResult) {
		added.forEach(({ id, semver, bundleHash }) =>
			this.logger.info(`Added ${id}@${semver} to the node contracts store`, { bundleHash }),
		);
		failed.forEach(({ workflowId, workflowName, node, action, pin, error }) =>
			this.logger.warn(
				`Workflow "${workflowName}" (${workflowId}) cannot run node "${node}": ${error}`,
				{ workflowId, action, version: pin.version, digest: pin.digest },
			),
		);
		unsupported.forEach(({ workflowId, workflowName, node, action, pin, nodeContract }) =>
			this.logger.warn(
				`Workflow "${workflowName}" (${workflowId}) pins node "${node}" to ${action}@${pin.version}, which needs Node Contract ${nodeContract}. This host does not run it.`,
				{ workflowId, action, version: pin.version, digest: pin.digest },
			),
		);
	}

	/** True when the node type is not a versioned contract node, or it lists the version. */
	private listsVersion(nodeType: string, version: number) {
		try {
			const { type } = this.loadNodesAndCredentials.getNode(nodeType);
			return !('nodeVersions' in type) || version in type.nodeVersions;
		} catch {
			return true;
		}
	}

	/** True when each node type lists the major of each version that this host runs. */
	private listsAll(manifests: readonly VersionManifest[], runs: ContractStore['runsNodeContract']) {
		return manifests.every(
			({ id, contract, nodeContract }) =>
				!runs(nodeContract) || this.listsVersion(nodeTypeOf(id), contract.version),
		);
	}

	/**
	 * Before a run: puts the pinned version of each contract node whose major no node type lists
	 * into the store, then rebuilds the node types. The store fetch has a short timeout. Its
	 * error names the action, version, digest, and registry.
	 */
	async prepareRun({ nodes }: Pick<IWorkflowBase, 'nodes'>) {
		const missing = nodes.filter(
			({ type, typeVersion }) => isContractNodeType(type) && !this.listsVersion(type, typeVersion),
		);
		if (missing.length === 0) return;
		const pinned = pinnedOf(this.loadNodesAndCredentials.loaders, missing);
		if (pinned.length === 0) return;
		const store = await this.nodeContractsStore.open();
		const manifests = await Promise.all(
			pinned.map(async ({ node, action, pin }) => {
				const { manifest } = await store.locked(action, pin);
				assertRunsAs(node, action, pin, manifest, store.runsNodeContract);
				return manifest;
			}),
		);
		const newMajor = !this.listsAll(manifests, store.runsNodeContract);
		await this.loadNodesAndCredentials.refreshNodeTypes(
			() => !this.listsAll(manifests, store.runsNodeContract),
		);
		// Only a host that fetches adds rows. A worker or a follower read a row that the leader announced.
		if (newMajor && this.nodeContractsStore.mayFetch()) {
			await this.nodeContractsStore.reloadOtherMains();
		}
	}
}

/** A stored version that cannot give the node its major would rebuild the node types for nothing. */
function assertRunsAs(
	node: INode,
	action: string,
	pin: INodeContractPin,
	manifest: VersionManifest,
	runs: ContractStore['runsNodeContract'],
) {
	const nodeType = nodeTypeOf(manifest.id);
	const checks: ReadonlyArray<readonly [boolean, string]> = [
		[nodeType === node.type, `is a version of ${nodeType}`],
		[manifest.contract.version === node.typeVersion, `is major ${manifest.contract.version}`],
		[
			runs(manifest.nodeContract),
			`needs Node Contract ${manifest.nodeContract}, which this host does not run`,
		],
	];
	const reason = checks.find(([passes]) => !passes)?.[1];
	if (reason) {
		throw new UserError(
			`Node "${node.name}" cannot run on version ${node.typeVersion}: its pin ${action}@${pin.version} (${pin.digest}) ${reason}`,
		);
	}
}
