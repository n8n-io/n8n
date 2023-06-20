/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CliWorkflowOperationError, SubworkflowOperationError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';
import { START_NODES } from './constants';

/**
 * Returns if the given id is a valid workflow id
 */
export function isWorkflowIdValid(id: string | null | undefined): boolean {
	// TODO: could also check if id only contains nanoId characters
	return typeof id === 'string' && id?.length <= 16;
}

function findWorkflowStart(executionMode: 'integrated' | 'cli') {
	return function (nodes: INode[]) {
		const executeWorkflowTriggerNode = nodes.find(
			(node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger',
		);

		if (executeWorkflowTriggerNode) return executeWorkflowTriggerNode;

		const startNode = nodes.find((node) => START_NODES.includes(node.type));

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

export const separate = <T>(array: T[], test: (element: T) => boolean) => {
	const pass: T[] = [];
	const fail: T[] = [];

	array.forEach((i) => (test(i) ? pass : fail).push(i));

	return [pass, fail];
};

export const webhookNotFoundErrorMessage = (
	path: string,
	httpMethod?: string,
	webhookMethods?: string[],
) => {
	let webhookPath = path;

	if (httpMethod) {
		webhookPath = `${httpMethod} ${webhookPath}`;
	}

	if (webhookMethods?.length && httpMethod) {
		let methods = '';

		if (webhookMethods.length === 1) {
			methods = webhookMethods[0];
		} else {
			const lastMethod = webhookMethods.pop();

			methods = `${webhookMethods.join(', ')} or ${lastMethod as string}`;
		}

		return `This webhook is not registered for ${httpMethod} requests. Did you mean to make a ${methods} request?`;
	} else {
		return `The requested webhook "${webhookPath}" is not registered.`;
	}
};
