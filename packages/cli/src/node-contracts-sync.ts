import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import {
	locksOf,
	NODE_PACKAGE,
	nodeTypeOf,
	runsNodeContract,
	syncContractStore,
	type ContractStore,
	type ContractSyncResult,
	type LockedNode,
	type NodeContractLock,
	type VersionManifest,
} from '@n8n/nodes-base-next';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { InstanceSettings } from 'n8n-core';
import { UserError, type INode, type IWorkflowBase } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeContractsStore } from '@/node-contracts-registry';

const PAGE_SIZE = 100;
const NO_RESULT: ContractSyncResult = { added: [], failed: [], unsupported: [] };

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
 * Puts the bundles that saved workflows lock into the node contracts store. n8n ships only the
 * HEAD of each action, so an older locked version comes from the registry.
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
		const published = await this.syncPages(store, options, true, undefined);
		const result = merge(published, await this.syncPages(store, options, false, undefined));
		if (result.added.length > 0) await this.nodeContractsStore.reloadOtherMains();
		return result;
	}

	private async syncPages(
		store: ContractStore,
		options: NodeContractsSyncOptions,
		published: boolean,
		afterId: string | undefined,
	): Promise<ContractSyncResult> {
		const { nodes, next } = await this.lockedPage(published, afterId);
		const result = nodes.length > 0 ? await syncContractStore(store, nodes) : NO_RESULT;
		this.report(result);
		const newMajor = () => !this.listsAll(result.added);
		if (options.refreshNodeTypes && newMajor()) {
			await this.loadNodesAndCredentials.refreshNodeTypes(newMajor);
		}
		if (next === undefined) return result;
		return merge(result, await this.syncPages(store, options, published, next));
	}

	/** The locked nodes of one page of workflows, and the id that the next page starts after. */
	private async lockedPage(published: boolean, afterId: string | undefined) {
		const workflows = await this.workflowRepository.findNodeContractMetaPage({
			published,
			afterId,
			take: PAGE_SIZE,
		});
		const nodes: LockedNode[] = workflows.flatMap(({ id, name, meta }) =>
			locksOf(meta).map(([node, lock]) => ({ workflowId: id, workflowName: name, node, lock })),
		);
		const last = workflows.at(-1);
		return { nodes, next: workflows.length < PAGE_SIZE ? undefined : last?.id };
	}

	/** The locks of all saved workflows. */
	async locks(): Promise<NodeContractLock[]> {
		return [
			...(await this.locksOfPages(true, undefined)),
			...(await this.locksOfPages(false, undefined)),
		];
	}

	private async locksOfPages(
		published: boolean,
		afterId: string | undefined,
	): Promise<NodeContractLock[]> {
		const { nodes, next } = await this.lockedPage(published, afterId);
		const locks = nodes.map(({ lock }) => lock);
		if (next === undefined) return locks;
		return [...locks, ...(await this.locksOfPages(published, next))];
	}

	private report({ added, failed, unsupported }: ContractSyncResult) {
		added.forEach(({ id, semver, bundleHash }) =>
			this.logger.info(`Added ${id}@${semver} to the node contracts store`, { bundleHash }),
		);
		failed.forEach(({ workflowId, workflowName, node, lock, error }) =>
			this.logger.warn(
				`Workflow "${workflowName}" (${workflowId}) cannot run node "${node}": ${error}`,
				{
					workflowId,
					action: lock.action,
					version: lock.version,
					bundleHash: lock.bundleHash,
				},
			),
		);
		unsupported.forEach(({ workflowId, workflowName, node, lock, nodeContract }) =>
			this.logger.warn(
				`Workflow "${workflowName}" (${workflowId}) locks node "${node}" to ${lock.action}@${lock.version}, which needs Node Contract ${nodeContract}. This host does not run it.`,
				{ workflowId, action: lock.action, version: lock.version, bundleHash: lock.bundleHash },
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
	private listsAll(manifests: readonly VersionManifest[]) {
		return manifests.every(
			({ id, contract, nodeContract }) =>
				!runsNodeContract(nodeContract) || this.listsVersion(nodeTypeOf({ id }), contract.version),
		);
	}

	/**
	 * Before a run: puts the locked bundle of each contract node whose major no node type lists
	 * into the store, then rebuilds the node types. The store fetch has a short timeout. Its
	 * error names the action, version, bundle hash, and registry.
	 */
	async prepareRun({ id, nodes }: Pick<IWorkflowBase, 'id' | 'nodes'>) {
		const missing = nodes.filter(
			({ type, typeVersion }) =>
				type.startsWith(`${NODE_PACKAGE}.`) && !this.listsVersion(type, typeVersion),
		);
		if (missing.length === 0 || !id) return;
		const [workflow] = await this.workflowRepository.findByIds([id], { fields: ['meta'] });
		const locks = new Map(locksOf(workflow?.meta));
		const locked = missing.flatMap((node) => {
			const lock = locks.get(node.name);
			return lock ? [{ node, lock }] : [];
		});
		if (locked.length === 0) return;
		const store = await this.nodeContractsStore.open();
		const manifests = await Promise.all(
			locked.map(async ({ node, lock }) => {
				const { manifest } = await store.locked(lock);
				assertRunsAs(node, lock, manifest);
				return manifest;
			}),
		);
		const newMajor = !this.listsAll(manifests);
		await this.loadNodesAndCredentials.refreshNodeTypes(() => !this.listsAll(manifests));
		// Only a host that fetches adds rows. A worker or a follower read a row that the leader announced.
		if (newMajor && this.nodeContractsStore.mayFetch()) {
			await this.nodeContractsStore.reloadOtherMains();
		}
	}
}

/** A stored version that cannot give the node its major would rebuild the node types for nothing. */
function assertRunsAs(node: INode, lock: NodeContractLock, manifest: VersionManifest) {
	const checks: ReadonlyArray<readonly [boolean, string]> = [
		[nodeTypeOf(manifest) === node.type, `is a version of ${nodeTypeOf(manifest)}`],
		[manifest.contract.version === node.typeVersion, `is major ${manifest.contract.version}`],
		[
			runsNodeContract(manifest.nodeContract),
			`needs Node Contract ${manifest.nodeContract}, which this host does not run`,
		],
	];
	const reason = checks.find(([passes]) => !passes)?.[1];
	if (reason) {
		throw new UserError(
			`Node "${node.name}" cannot run on version ${node.typeVersion}: its lock ${lock.action}@${lock.version} (bundle ${lock.bundleHash}) ${reason}`,
		);
	}
}
