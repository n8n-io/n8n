/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CliWorkflowOperationError, SubworkflowOperationError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

function findWorkflowStart(executionMode: 'integrated' | 'cli') {
	return function (nodes: INode[]) {
		const executeWorkflowTriggerNode = nodes.find(
			(node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger',
		);

		if (executeWorkflowTriggerNode) return executeWorkflowTriggerNode;

		const startNode = nodes.find((node) => node.type === 'n8n-nodes-base.start');

		if (startNode) return startNode;

		const title = 'Missing node to start execution';
		const description =
			"Please make sure the workflow you're calling contains an Execute Workflow Trigger node";

		if (executionMode === 'integrated') {
			throw new SubworkflowOperationError(title, description);
		}

		throw new CliWorkflowOperationError(title, description);
	};
}

export const findSubworkflowStart = findWorkflowStart('integrated');

export const findCliWorkflowStart = findWorkflowStart('cli');

export const alphabetizeKeys = (obj: INode) =>
	Object.keys(obj)
		.sort()
		.reduce<Partial<INode>>(
			(acc, key) => ({
				...acc,
				// @ts-expect-error @TECH_DEBT Adding index signature to INode causes type issues downstream
				[key]: obj[key],
			}),
			{},
		);
