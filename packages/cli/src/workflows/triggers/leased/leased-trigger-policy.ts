import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { ClusterLeases } from '@/scheduling/leases/cluster-leases';

/**
 * Decides which trigger nodes run on a cluster lease instead of on the leader.
 * None do unless the instance runs held tasks and the node type is listed in
 * `N8N_WORKFLOW_LEASED_TRIGGER_NODE_TYPES`.
 */
@Service()
export class LeasedTriggerPolicy {
	private readonly nodeTypes: ReadonlySet<string>;

	constructor(globalConfig: GlobalConfig, clusterLeases: ClusterLeases) {
		const listed = globalConfig.workflows.leasedTriggerNodeTypes
			.split(',')
			.map((type) => type.trim())
			.filter((type) => type.length > 0);
		this.nodeTypes = clusterLeases.isAvailable() ? new Set(listed) : new Set();
	}

	isEnabled(): boolean {
		return this.nodeTypes.size > 0;
	}

	isLeased(node: Pick<INode, 'type'>): boolean {
		return this.nodeTypes.has(node.type);
	}

	/** The nodes the leader activates itself. */
	withoutLeased<T extends Pick<INode, 'type'>>(nodes: T[]): T[] {
		return nodes.filter((node) => !this.isLeased(node));
	}
}
