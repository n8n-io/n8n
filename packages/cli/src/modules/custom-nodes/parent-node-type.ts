import { UnexpectedError } from '@n8n/errors';
import { RoutingNode, type ExecuteContext } from 'n8n-core';
import type { EngineResponse, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { isNodeClassInstance } from 'n8n-workflow';

import { assertServedAction, type ServedActionVersions } from './custom-node-type';
import { isCustomActionSelected, type ParentShape } from './parent-action.generator';

export interface ParentExtension {
	shape: ParentShape;
	/** The editor and parameter resolution use this description. */
	extendedDescription: INodeTypeDescription;
	/** `RoutingNode` runs this description for a custom action. `undefined`: no action has a version. */
	runtimeDescription?: INodeTypeDescription;
	served: ServedActionVersions;
}

/** Prototype-backed copy of `nodeType`. `nodeType` is not changed. */
export function createParentNodeType(nodeType: INodeType, extension: ParentExtension): INodeType {
	const { shape, extendedDescription, runtimeDescription, served } = extension;

	/** Calls the `execute` of the original node type in the style that the node type uses. */
	async function runOriginal(context: ExecuteContext, response?: EngineResponse) {
		// Read at call time: `NodeTypes` can add `execute` to a declarative node after the copy exists.
		if (isNodeClassInstance(nodeType)) {
			// The original instance is the receiver, as the engine calls a `Node` subclass.
			if (nodeType.execute) return await nodeType.execute(context, response);
		} else if (nodeType.execute) {
			return await nodeType.execute.call(context, response);
		}
		throw new UnexpectedError('The parent node type has no execute method', {
			extra: { nodeType: nodeType.description.name },
		});
	}

	async function run(context: ExecuteContext, response?: EngineResponse) {
		const node = context.getNode();
		if (!isCustomActionSelected(shape, node.parameters, served)) {
			return await runOriginal(context, response);
		}

		assertServedAction(node, served);
		// Not reached without a served version: `assertServedAction` throws first.
		if (!runtimeDescription) {
			throw new UnexpectedError('A served custom action has no run-time description', {
				extra: { nodeType: nodeType.description.name },
			});
		}
		return (await new RoutingNode(context, { description: runtimeDescription }).runNode()) ?? [];
	}

	// The engine gives a `Node` subclass the context as an argument, other node types get it as `this`.
	// The copy inherits the class tag, so its `execute` must use the style of the original.
	const execute = isNodeClassInstance(nodeType)
		? async (context: ExecuteContext, response?: EngineResponse) => await run(context, response)
		: async function (this: ExecuteContext, response?: EngineResponse) {
				return await run(this, response);
			};

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
