import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

/**
 * Call before `new Workflow`: it adds the stored majors that the contract nodes of the
 * workflow need to the node types. Without them, `new Workflow` fails with
 * `NodeVersionNotFoundError`.
 */
export async function prepareNodeContractsRun(workflow: Pick<IWorkflowBase, 'id' | 'nodes'>) {
	if (!Container.get(GlobalConfig).instanceAi.nodeContractsEnabled) return;
	const { NODE_PACKAGE } = await import('@n8n/nodes-base-next');
	if (!workflow.nodes.some(({ type }) => type.startsWith(`${NODE_PACKAGE}.`))) return;
	const { NodeContractsSync } = await import('@/node-contracts-sync.js');
	await Container.get(NodeContractsSync).prepareRun(workflow);
}
