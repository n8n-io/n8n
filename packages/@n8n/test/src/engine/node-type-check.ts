import { NodeConnectionTypes } from 'n8n-workflow';

import { WorkflowTestError } from '../errors';
import type { NodeDefinition, WorkflowHandle } from '../workflow-set';
import { isNodeTypeInstalled } from './node-types';

export function checkNodeTypesInstalled(handle: WorkflowHandle): void {
	const missing = handle.definition.nodes.find(
		(node) =>
			!node.disabled &&
			!isNodeTypeInstalled(node.type, node.typeVersion) &&
			!isReplacedByMock(handle, node.name, new Set()),
	);
	if (!missing) return;
	throw notInstalled(handle, missing);
}

function isReplacedByMock(handle: WorkflowHandle, name: string, visited: Set<string>): boolean {
	if (handle.mocks.has(name)) return true;
	if (visited.has(name)) return false;
	visited.add(name);
	const outputs = Object.entries(handle.definition.connections[name] ?? {});
	if (outputs.length === 0 || outputs.some(([type]) => type === NodeConnectionTypes.Main)) {
		return false;
	}
	const consumers = outputs.flatMap(([, connections]) =>
		connections.flatMap((connection) => connection ?? []),
	);
	return consumers.every((consumer) => isReplacedByMock(handle, consumer.node, visited));
}

function notInstalled(handle: WorkflowHandle, node: NodeDefinition) {
	return new WorkflowTestError(
		'NODE_TYPE_NOT_INSTALLED',
		`Node "${node.name}" in workflow "${handle.name}" has the type "${node.type}" version ${node.typeVersion}, which is not installed. Install the package that holds the node in the test project, or mock the node with mockNode().`,
		{ workflow: handle.name, node: node.name },
	);
}
