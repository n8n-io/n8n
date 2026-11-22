import { RoutingNode, type ExecuteContext } from 'n8n-core';
import type { INode, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { OPERATION_PARAMETER, PIN_ACTION_NAME_PARAMETER, readPin } from './version-pin';

/** The action versions that a node type serves, by action id. */
export type ServedActionVersions = ReadonlyMap<string, ReadonlySet<number>>;

/**
 * Checks the selected action of a node before a request is sent.
 * Without a matching option, `RoutingNode` would send the request defaults with the credential.
 */
export function assertServedAction(node: INode, served: ServedActionVersions): void {
	const value = node.parameters[OPERATION_PARAMETER];
	if (value === undefined || value === null || value === '') {
		throw new NodeOperationError(node, 'No action is selected. Select an action for this node.');
	}

	const pin = readPin(node.parameters);
	if (pin && served.get(pin.actionId)?.has(pin.version)) return;

	const storedName = node.parameters[PIN_ACTION_NAME_PARAMETER];
	const name =
		pin?.actionName ?? (typeof storedName === 'string' && storedName !== '' ? storedName : '');
	const subject = name === '' ? 'The selected action' : `The action "${name}"`;
	throw new NodeOperationError(
		node,
		`${subject} does not exist any more or is not available for this node. Select another action.`,
	);
}

/**
 * Builds the node type that the loader serves. `execute` checks the selected action,
 * then runs the declarative request with `RoutingNode`, as `NodeTypes` does for other nodes.
 */
export function createCustomNodeType(
	description: INodeTypeDescription,
	served: ServedActionVersions,
): INodeType {
	const nodeType: INodeType = {
		description,
		async execute(this: ExecuteContext) {
			assertServedAction(this.getNode(), served);
			return (await new RoutingNode(this, nodeType).runNode()) ?? [];
		},
	};
	return nodeType;
}
