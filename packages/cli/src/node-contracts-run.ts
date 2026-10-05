import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

/**
 * Call before `new Workflow`: it adds the stored majors that the contract nodes of the
 * workflow need to the node types. Without them, `new Workflow` fails with
 * `NodeVersionNotFoundError`.
 */
export async function prepareNodeContractsRun(workflow: Pick<IWorkflowBase, 'id' | 'nodes'>) {
	if (!Container.get(GlobalConfig).instanceAi.nodeContractsEnabled) return;
	const { isContractNodeType } = await import('@n8n/nodes-base-next');
	if (!workflow.nodes.some(({ type }) => isContractNodeType(type))) return;
	const { NodeContractsSync } = await import('@/node-contracts-sync.js');
	await Container.get(NodeContractsSync).prepareRun(workflow);
}

/**
 * The nodes of a save with the pin of each contract node, see `pinnedNodesOf`. Call it before
 * the policy check, because a clearance of a new workflow binds to its nodes. `storedNodes` are
 * the nodes of the saved workflow that the save replaces. Without node contracts, the nodes
 * stay as they are.
 */
export async function pinNodeContracts(
	nodes: INode[],
	storedNodes?: readonly INode[],
): Promise<INode[]> {
	if (!Container.get(GlobalConfig).instanceAi.nodeContractsEnabled) return nodes;
	const { pinnedNodesOf } = await import('@/node-contracts-registry.js');
	return await pinnedNodesOf(nodes, storedNodes);
}

/**
 * The node groups of a run of a published or active version. Without node contracts, the run
 * takes the groups of the draft.
 */
export function nodeGroupsForRun<G>(draftGroups: G, versionGroups: G): G {
	return Container.get(GlobalConfig).instanceAi.nodeContractsEnabled ? versionGroups : draftGroups;
}

export function assertNodeContractsEnabled(command: string) {
	if (Container.get(GlobalConfig).instanceAi.nodeContractsEnabled) return;
	throw new UserError(
		`${command} needs node contracts. Set N8N_INSTANCE_AI_NODE_CONTRACTS_ENABLED=true to use it.`,
	);
}
