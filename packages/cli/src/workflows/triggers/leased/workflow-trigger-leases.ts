import { WorkflowPublishedVersionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { LeaseSpec } from '@n8n/leases';
import type { INode } from 'n8n-workflow';

import { ClusterLeases } from '@/scheduling/leases/cluster-leases';
import { triggerRegistration } from '@/workflows/publication/trigger-diff';
import { NodeTypes } from '@/node-types';
import { getEnabledTriggerNodes } from '@/workflows/triggers/enabled-trigger-nodes';

import { LeasedTriggerPolicy } from './leased-trigger-policy';
import { WorkflowTriggerLeaseHolder } from './workflow-trigger-lease-holder';

export const WORKFLOW_TRIGGER_LEASE_KIND = 'workflow-trigger';

/** What a holder needs to arm one trigger node, and what hands the lease over when it changes. */
export interface WorkflowTriggerLeaseData extends Record<string, unknown> {
	workflowId: string;
	nodeId: string;
	registration: Partial<INode>;
}

export const workflowTriggerLeaseKey = (workflowId: string, nodeId: string) =>
	`${workflowId}:${nodeId}`;

const workflowIdOfKey = (key: string) => key.slice(0, key.indexOf(':'));

/**
 * The `workflow-trigger` lease kind: one lease for each enabled, leased trigger
 * node of a published workflow. The published version is the source of truth, so
 * a lease follows the publication outbox through {@link changed}.
 */
@Service()
export class WorkflowTriggerLeases {
	constructor(
		private readonly policy: LeasedTriggerPolicy,
		private readonly clusterLeases: ClusterLeases,
		private readonly publishedVersions: WorkflowPublishedVersionRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly holder: WorkflowTriggerLeaseHolder,
	) {}

	/** Register the kind. Call before the cluster leases start. */
	init(): void {
		if (!this.policy.isEnabled()) return;
		this.clusterLeases.registerKind({
			name: WORKFLOW_TRIGGER_LEASE_KIND,
			handler: this.holder,
			listDesired: async (keys) => await this.listDesired(keys),
		});
	}

	/**
	 * Sync the leases of one workflow after its publication changed. `versionNodes`
	 * are the nodes of the versions involved, so leases of removed nodes go too.
	 */
	async changed(
		workflowId: string,
		versionNodes: Array<INode[] | null | undefined>,
	): Promise<void> {
		if (!this.policy.isEnabled()) return;
		const keys = new Set<string>();
		for (const nodes of versionNodes) {
			for (const node of this.leasedTriggerNodes(nodes ?? [])) {
				keys.add(workflowTriggerLeaseKey(workflowId, node.id));
			}
		}
		if (keys.size > 0) await this.clusterLeases.changed(WORKFLOW_TRIGGER_LEASE_KIND, [...keys]);
	}

	private async listDesired(keys?: readonly string[]): Promise<LeaseSpec[]> {
		const workflowIds = keys === undefined ? undefined : [...new Set(keys.map(workflowIdOfKey))];
		const published = await this.publishedVersions.findPublishedNodes(workflowIds);
		const wanted = keys === undefined ? undefined : new Set(keys);
		return published.flatMap(({ workflowId, nodes }) =>
			this.leasedTriggerNodes(nodes)
				.map((node): LeaseSpec => {
					const data: WorkflowTriggerLeaseData = {
						workflowId,
						nodeId: node.id,
						registration: triggerRegistration(node),
					};
					return { key: workflowTriggerLeaseKey(workflowId, node.id), data };
				})
				.filter((spec) => wanted === undefined || wanted.has(spec.key)),
		);
	}

	private leasedTriggerNodes(nodes: INode[]): INode[] {
		return getEnabledTriggerNodes({ nodes, connections: {} }, this.nodeTypes).filter((node) =>
			this.policy.isLeased(node),
		);
	}
}
