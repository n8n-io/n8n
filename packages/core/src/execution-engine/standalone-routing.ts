import { createRunExecutionData } from 'n8n-workflow';
import type {
	INodeExecutionData,
	INodePropertyRouting,
	INodeType,
	IWorkflowDataProxyAdditionalKeys,
} from 'n8n-workflow';

import { ExecuteContext } from './node-execution-context';
import type { NodeExecutionContext } from './node-execution-context/node-execution-context';
import { RoutingNode } from './routing-node';

/**
 * Runs a `routing` block that is not attached to a node parameter, for example the
 * request of a declarative trigger. `RoutingNode` reads routing from properties and
 * runs once per input item, so the block goes on a nameless hidden property and runs
 * against one empty item.
 */
export async function runStandaloneRouting(
	context: Pick<NodeExecutionContext, 'workflow' | 'node' | 'additionalData' | 'mode'>,
	nodeType: INodeType,
	routing: INodePropertyRouting,
	extraKeys: IWorkflowDataProxyAdditionalKeys = {},
): Promise<INodeExecutionData[]> {
	const { workflow, node, additionalData, mode } = context;
	const executeContext = new ExecuteContext(
		workflow,
		node,
		additionalData,
		mode,
		createRunExecutionData(),
		0,
		[],
		{ main: [[{ json: {} }]] },
		{ node, data: {}, source: null },
		[],
	);
	const routingNodeType: INodeType = {
		...nodeType,
		description: {
			...nodeType.description,
			properties: [
				...nodeType.description.properties,
				{ displayName: '', name: '', type: 'hidden', default: '', routing },
			],
		},
	};
	const routingNode = new RoutingNode(executeContext, routingNodeType, undefined, extraKeys);
	return (await routingNode.runNode())?.[0] ?? [];
}
