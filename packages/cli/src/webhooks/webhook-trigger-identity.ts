import type { INode } from 'n8n-workflow';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

/**
 * Predicate (not an action): checks whether the start node will establish a
 * triggering-user identity from within its `webhook()` method (via
 * `context.establishTriggerIdentity`). Such nodes need their `runExecutionData`
 * created before the webhook runs, and the webhook output merged into the seeded
 * execution stack afterwards.
 *
 * The Webhook node does this only when its opt-in "n8n User Auth (OAuth2)" mode
 * (`n8nOAuth2`) is selected; the MCP / chat / Agent365 triggers always do.
 */
export function shouldEstablishTriggerIdentity(workflowStartNode: INode): boolean {
	return (
		workflowStartNode.type === WEBHOOK_NODE_TYPE &&
		workflowStartNode.parameters?.authentication === 'n8nOAuth2'
	);
}
