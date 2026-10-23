import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { ClusterLeases } from '@/scheduling/leases/cluster-leases';

/**
 * Decides which trigger nodes run on a cluster lease instead of on the leader.
 * None do unless the instance runs held tasks and the node type is listed in
 * `N8N_WORKFLOW_LEASED_TRIGGER_NODE_TYPES`. Only nodes that implement
 * `trigger()` qualify: poll triggers run on the durable scheduler already.
 */
@Service()
export class LeasedTriggerPolicy {
	private readonly listedTypes: ReadonlySet<string>;

	constructor(
		globalConfig: GlobalConfig,
		clusterLeases: ClusterLeases,
		private readonly nodeTypes: NodeTypes,
	) {
		const listed = globalConfig.workflows.leasedTriggerNodeTypes
			.split(',')
			.map((type) => type.trim())
			.filter((type) => type.length > 0);
		this.listedTypes = clusterLeases.isAvailable() ? new Set(listed) : new Set();
	}

	isEnabled(): boolean {
		return this.listedTypes.size > 0;
	}

	isLeased(node: Pick<INode, 'type' | 'typeVersion'>): boolean {
		if (!this.listedTypes.has(node.type)) return false;
		try {
			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			return typeof nodeType.trigger === 'function' && nodeType.poll === undefined;
		} catch {
			return false;
		}
	}

	/** The nodes the leader activates itself. */
	withoutLeased<T extends Pick<INode, 'type' | 'typeVersion'>>(nodes: T[]): T[] {
		return nodes.filter((node) => !this.isLeased(node));
	}
}
