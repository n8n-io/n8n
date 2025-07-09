import { CliWorkflowOperationError, SubworkflowOperationError } from 'n8n-workflow';
import type { INode, INodeType } from 'n8n-workflow';

import { STARTING_NODES } from '@/constants';

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

		const startNode = nodes.find((node) => STARTING_NODES.includes(node.type));

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

export const toError = (maybeError: unknown) =>
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	maybeError instanceof Error ? maybeError : new Error(`${maybeError}`);

export const isIntegerString = (value: string) => /^\d+$/.test(value);

export function removeTrailingSlash(path: string) {
	return path.endsWith('/') ? path.slice(0, -1) : path;
}

// return the difference between two arrays
export function rightDiff<T1, T2>(
	[arr1, keyExtractor1]: [T1[], (item: T1) => string],
	[arr2, keyExtractor2]: [T2[], (item: T2) => string],
): T2[] {
	// create map { itemKey => true } for fast lookup for diff
	const keyMap = arr1.reduce<{ [key: string]: true }>((map, item) => {
		map[keyExtractor1(item)] = true;
		return map;
	}, {});

	// diff against map
	return arr2.reduce<T2[]>((acc, item) => {
		if (!keyMap[keyExtractor2(item)]) {
			acc.push(item);
		}
		return acc;
	}, []);
}

/**
 * Asserts that the passed in type is never.
 * Can be used to make sure the type is exhausted
 * in switch statements or if/else chains.
 */
export const assertNever = (_value: never) => {};

export const isPositiveInteger = (maybeInt: string) => /^[1-9]\d*$/.test(maybeInt);

/**
 * Check if a execute method should be assigned to the node
 */
export const shouldAssignExecuteMethod = (nodeType: INodeType) => {
	const isDeclarativeNode = nodeType?.description?.requestDefaults !== undefined;

	return (
		!nodeType.execute &&
		!nodeType.poll &&
		!nodeType.trigger &&
		(!nodeType.webhook || isDeclarativeNode) &&
		!nodeType.methods
	);
};
