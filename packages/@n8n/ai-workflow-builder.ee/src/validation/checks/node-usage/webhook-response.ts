import { getChildNodes } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { ProgrammaticViolation } from '../../types';

const WEBHOOK_NODE_TYPE = 'n8n-nodes-base.webhook';
const RESPOND_TO_WEBHOOK_NODE_TYPE = 'n8n-nodes-base.respondToWebhook';

/**
 * Gets the responseMode from a webhook node's parameters
 */
function getResponseMode(node: SimpleWorkflow['nodes'][0]): string | undefined {
	const responseMode = node.parameters?.responseMode;
	return typeof responseMode === 'string' ? responseMode : undefined;
}

/**
 * Checks if a RespondToWebhook node is connected downstream from the given webhook node
 */
function hasConnectedRespondToWebhook(
	webhookNodeName: string,
	respondToWebhookNodeNames: Set<string>,
	connections: SimpleWorkflow['connections'],
): boolean {
	if (!connections) {
		return false;
	}

	const childNodes = getChildNodes(connections, webhookNodeName, 'ALL', -1);
	return childNodes.some((nodeName) => respondToWebhookNodeNames.has(nodeName));
}

/**
 * Validates webhook response mode configuration:
 * 1. If webhook has responseMode='responseNode', a RespondToWebhook node must be connected downstream
 * 2. If RespondToWebhook node is connected downstream, webhook's responseMode must be 'responseNode'
 */
export function validateWebhookResponse(workflow: SimpleWorkflow): ProgrammaticViolation[] {
	const violations: ProgrammaticViolation[] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		return violations;
	}

	// Find all webhook nodes and respond-to-webhook nodes
	const webhookNodes = workflow.nodes.filter((node) => node.type === WEBHOOK_NODE_TYPE);
	const respondToWebhookNodes = workflow.nodes.filter(
		(node) => node.type === RESPOND_TO_WEBHOOK_NODE_TYPE,
	);

	const respondToWebhookNodeNames = new Set(respondToWebhookNodes.map((node) => node.name));

	// Check each webhook node
	for (const webhookNode of webhookNodes) {
		const responseMode = getResponseMode(webhookNode);
		const hasConnectedResponder = hasConnectedRespondToWebhook(
			webhookNode.name,
			respondToWebhookNodeNames,
			workflow.connections,
		);

		// Violation 1: responseMode='responseNode' but no RespondToWebhook node is connected downstream
		if (responseMode === 'responseNode' && !hasConnectedResponder) {
			violations.push({
				name: 'webhook-response-mode-missing-respond-node',
				type: 'critical',
				description: `Webhook node "${webhookNode.name}" has responseMode='responseNode' but no "Respond to Webhook" node is connected downstream. Either add and connect a "Respond to Webhook" node or change the response mode to 'onReceived' or 'lastNode'.`,
				pointsDeducted: 50,
				metadata: {
					webhookNodeName: webhookNode.name,
					webhookNodeId: webhookNode.id,
				},
			});
		}

		// Violation 2: RespondToWebhook node is connected but webhook's responseMode is not 'responseNode'
		if (hasConnectedResponder && responseMode !== 'responseNode') {
			violations.push({
				name: 'webhook-response-mode-mismatch',
				type: 'critical',
				description: `Webhook "${webhookNode.name}" has a "Respond to Webhook" node connected downstream but responseMode='${responseMode ?? 'undefined'}'. The responseMode must be 'responseNode' for the Respond to Webhook node to work.`,
				pointsDeducted: 50,
				metadata: {
					webhookNodeName: webhookNode.name,
					webhookNodeId: webhookNode.id,
					currentResponseMode: responseMode ?? 'undefined',
				},
			});
		}
	}

	return violations;
}
