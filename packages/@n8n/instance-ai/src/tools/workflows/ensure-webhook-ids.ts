import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { randomUUID } from 'node:crypto';

import type { InstanceAiContext } from '../../types';

/** Node types that require a webhookId for proper webhook path registration. */
const WEBHOOK_NODE_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'@n8n/n8n-nodes-langchain.mcpTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
]);

/**
 * Ensure webhook nodes have a webhookId so n8n registers clean URL paths.
 * Without it, getNodeWebhookPath() falls back to encoding the node name
 * into the path (e.g., "{workflowId}/get%20%2Fdashboard/dashboard").
 *
 * For updates: preserves existing webhookIds from the current workflow so
 * webhook URLs remain stable. Only generates new IDs for new nodes.
 */
export async function ensureWebhookIds(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
): Promise<void> {
	// For updates, read existing webhookIds so we don't change URLs
	const existingWebhookIds = new Map<string, string>();
	if (workflowId) {
		try {
			const existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
			for (const node of existing.nodes ?? []) {
				if (node.webhookId && node.name) {
					existingWebhookIds.set(node.name, node.webhookId);
				}
			}
		} catch {
			// Can't fetch existing — will generate new IDs
		}
	}

	for (const node of json.nodes ?? []) {
		if (WEBHOOK_NODE_TYPES.has(node.type) && !node.webhookId) {
			// Reuse existing webhookId if this node name existed before
			node.webhookId = (node.name && existingWebhookIds.get(node.name)) ?? randomUUID();
		}
	}
}
