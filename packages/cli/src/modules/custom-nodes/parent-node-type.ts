import { UnexpectedError } from '@n8n/errors';
import { RoutingNode, type ExecuteContext } from 'n8n-core';
import type { EngineResponse, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { assertServedAction, type ServedActionVersions } from './custom-node-type';
import { isCustomActionSelected, type ParentShape } from './parent-action.generator';

export interface ParentExtension {
	shape: ParentShape;
	/** The editor and parameter resolution use this description. */
	extendedDescription: INodeTypeDescription;
	/** `RoutingNode` runs this description for a custom action. */
	runtimeDescription: INodeTypeDescription;
	served: ServedActionVersions;
}

/** Prototype-backed copy of `nodeType`. `nodeType` is not changed. */
export function createParentNodeType(nodeType: INodeType, extension: ParentExtension): INodeType {
	const { shape, extendedDescription, runtimeDescription, served } = extension;

	async function execute(this: ExecuteContext, response?: EngineResponse) {
		const node = this.getNode();
		if (!isCustomActionSelected(shape, node.parameters, served)) {
			// Read at call time: `NodeTypes` can add `execute` to a declarative node after the copy exists.
			const originalExecute = nodeType.execute;
			if (!originalExecute) {
				throw new UnexpectedError('The parent node type has no execute method', {
					extra: { nodeType: nodeType.description.name },
				});
			}
			return await originalExecute.call(this, response);
		}

		assertServedAction(node, served);
		return (await new RoutingNode(this, { description: runtimeDescription }).runNode()) ?? [];
	}

	// Own properties on the copy only. Other members, for example `methods`, come from the prototype.
	const copy: INodeType = Object.create(nodeType, {
		description: {
			value: extendedDescription,
			enumerable: true,
			writable: true,
			configurable: true,
		},
		execute: { value: execute, enumerable: true, writable: true, configurable: true },
	});
	return copy;
}
