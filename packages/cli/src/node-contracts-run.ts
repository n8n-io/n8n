import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';
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
