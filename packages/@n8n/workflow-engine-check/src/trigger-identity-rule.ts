import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	classifyTriggerIdentity,
	isTriggerNodeType,
	type INode,
} from 'n8n-workflow';

import type { EngineV2Reason } from './types';

/**
 * Mirrors the identity check in `EngineV2Dispatcher.assertSupported`. The dispatcher
 * checks only the trigger that fired, so this reports every live trigger that could fire.
 */
export function findTriggerIdentityReasons(nodes: INode[]): EngineV2Reason[] {
	return nodes
		.filter(
			(node) =>
				node.disabled !== true &&
				// v2 starts a sub-workflow through `EngineSubWorkflowService`, which skips the dispatcher.
				node.type !== EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE &&
				isTriggerNodeType(node.type) &&
				classifyTriggerIdentity(node.type, node.parameters).providesExternalIdentity,
		)
		.map((node) => ({
			code: 'trigger-external-identity',
			severity: 'blocking',
			nodeId: node.id,
			nodeName: node.name,
			message: `Engine v2 cannot run the "${node.name}" trigger yet, because it takes credentials from the request.`,
		}));
}
