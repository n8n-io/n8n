import type { Types } from 'n8n-core';
import type {
	INodeProperties,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	KnownNodesAndCredentials,
} from 'n8n-workflow';
import { deepCopy, LoggerProxy, NodeConnectionTypes, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { copyCredentialSupport, isFullDescription, setToolCodex } from './utils';

/**
 * Check if a node has a sendAndWait operation.
 * A node is considered to have sendAndWait if:
 * 1. It has webhooks configured (sendAndWait uses webhooks for the response)
 * 2. It has an 'operation' property with 'sendAndWait' as an option
 * 3. It's not already a Tool variant (to avoid creating DiscordToolHitlTool)
 */
export function hasSendAndWaitOperation(nodeType: INodeTypeDescription): boolean {
	// Skip nodes that are already AI Tool variants (end with 'Tool')
	// This prevents creating double HITL tools like 'discordToolHitlTool'
	if (nodeType.name.endsWith('Tool')) {
		return false;
	}

	// Must have webhooks configured
	if (!nodeType.webhooks || nodeType.webhooks.length === 0) {
		return false;
	}

	// Check ALL operation properties (nodes can have multiple for different resources)
	const operationProps = nodeType.properties.filter((p) => p.name === 'operation');
	if (operationProps.length === 0) {
		return false;
	}

	// Check if ANY operation property has sendAndWait
	for (const operationProp of operationProps) {
		if (!Array.isArray(operationProp.options)) continue;

		const hasSendAndWait = operationProp.options.some(
			(opt) => typeof opt === 'object' && 'value' in opt && opt.value === SEND_AND_WAIT_OPERATION,
		);

		if (hasSendAndWait) {
			return true;
		}
	}

	return false;
}

/**
 * Find which resource has the sendAndWait operation.
 */
function findSendAndWaitResource(properties: INodeProperties[]): string | undefined {
	// Look for operation properties that have sendAndWait and check their displayOptions
	for (const prop of properties) {
		if (prop.name === 'operation' && Array.isArray(prop.options)) {
			const hasSendAndWait = prop.options.some(
				(opt) => typeof opt === 'object' && 'value' in opt && opt.value === SEND_AND_WAIT_OPERATION,
			);
			if (hasSendAndWait && prop.displayOptions?.show?.resource) {
				const resources = prop.displayOptions.show.resource;
				if (Array.isArray(resources) && resources.length > 0) {
					return resources[0] as string;
				}
			}
		}
	}
	return undefined;
}

/**
 * Filter properties to only include those relevant for HITL tool operation.
 * Keeps resource/operation as hidden properties to preserve displayOptions dependencies.
 */
function filterHitlToolProperties(
	properties: INodeProperties[],
	originalDisplayName: string,
): INodeProperties[] {
	const filtered: INodeProperties[] = [];
	const sendAndWaitResource = findSendAndWaitResource(properties);

	// Set description type to manual so makeDescription doesn't override
	filtered.push({
		displayName: 'Description Type',
		name: 'descriptionType',
		type: 'hidden',
		default: 'manual',
	});

	// Add tool description as first property
	filtered.push({
		displayName: 'Tool Description',
		name: 'toolDescription',
		type: 'string',
		default: originalDisplayName,
		required: true,
		typeOptions: { rows: 2 },
		description:
			'Explain to the LLM what this HITL tool does. The agent will know that tools connected to this node require human approval.',
	});

	for (const prop of properties) {
		// Convert resource to hidden property with sendAndWait resource as default
		if (prop.name === 'resource') {
			if (sendAndWaitResource) {
				filtered.push({
					displayName: 'Resource',
					name: 'resource',
					type: 'hidden',
					default: sendAndWaitResource,
				});
			}
			continue;
		}

		// Convert operation to hidden property with sendAndWait as default
		if (prop.name === 'operation') {
			filtered.push({
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				default: SEND_AND_WAIT_OPERATION,
			});
			continue;
		}

		// Keep responseType but default to 'approval' for HITL use case
		if (prop.name === 'responseType') {
			const cloned = deepCopy(prop);
			cloned.default = 'approval';
			filtered.push(cloned);
			continue;
		}

		// Keep approvalOptions visible so users can customize approval buttons
		if (prop.name === 'approvalOptions') {
			filtered.push(deepCopy(prop));
			continue;
		}

		// Keep all other properties to preserve displayOptions dependencies
		filtered.push(deepCopy(prop));
	}

	return filtered;
}

/**
 * Convert a node description to an HITL tool variant.
 * Modifies the description to:
 * - Add 'HitlTool' suffix to name
 * - Set inputs to AiTool (for connected tools to gate)
 * - Set outputs to AiTool (so agents can use it)
 * - Filter properties to sendAndWait-relevant ones
 * - Set codex category to AI > Tools > Human in the Loop
 */
export function convertNodeToHitlTool<
	T extends object & { description: INodeTypeDescription | INodeTypeBaseDescription },
>(item: T): T {
	if (isFullDescription(item.description)) {
		const originalDisplayName = item.description.displayName;

		// Naming convention: slackHitlTool, emailSendHitlTool, etc.
		item.description.name += 'HitlTool';
		item.description.displayName = originalDisplayName; // Just the service name (e.g., "Slack")
		item.description.subtitle = 'Send and wait';
		item.description.description = 'Request human approval for tools';

		// HITL Tool connections:
		// - Input: Tools to gate (labeled "Tool")
		// - Output: Connects to Agent (labeled "Human Review")
		item.description.inputs = [
			{
				displayName: 'Tool',
				type: NodeConnectionTypes.AiTool,
				required: true,
			},
		];
		item.description.outputs = [
			{
				displayName: 'Human Review',
				type: NodeConnectionTypes.AiTool,
			},
		];

		// Filter and adjust properties for HITL use case
		item.description.properties = filterHitlToolProperties(
			item.description.properties,
			originalDisplayName,
		);

		// Keep webhooks - original node's webhook handler will be used
		// The execution engine handles HITL-specific behavior
	}

	setToolCodex(item.description, 'Human in the Loop');
	return item;
}

/**
 * Generate HITL tool variants for all nodes with sendAndWait operations.
 * Called during node loading to create HITL tool nodes automatically.
 */
export function createHitlTools(types: Types, known: KnownNodesAndCredentials): void {
	// Log nodes with webhooks for debugging
	const nodesWithWebhooks = types.nodes.filter(
		(n) => n.webhooks && n.webhooks.length > 0 && !n.name.endsWith('Tool'),
	);
	LoggerProxy.debug('[HITL] Nodes with webhooks (excluding Tool variants)', {
		count: nodesWithWebhooks.length,
		nodeNames: nodesWithWebhooks.map((n) => n.name),
	});

	const sendAndWaitNodes = types.nodes.filter(hasSendAndWaitOperation);

	LoggerProxy.debug('[HITL] Found nodes with sendAndWait operation', {
		count: sendAndWaitNodes.length,
		nodeNames: sendAndWaitNodes.map((n) => n.name),
	});

	for (const sendAndWaitNode of sendAndWaitNodes) {
		const description = deepCopy(sendAndWaitNode);
		const wrapped = convertNodeToHitlTool({ description }).description;

		LoggerProxy.debug('[HITL] Created HITL tool variant', {
			originalNode: sendAndWaitNode.name,
			hitlToolName: wrapped.name,
			hitlToolDisplayName: wrapped.displayName,
		});

		// Add to node types
		types.nodes.push(wrapped);

		// Point to original node's class - execution engine handles HITL-specific behavior
		// by detecting nodes with 'HitlTool' suffix
		known.nodes[wrapped.name] = { ...known.nodes[sendAndWaitNode.name] };

		copyCredentialSupport(known, sendAndWaitNode.name, wrapped.name);
	}

	LoggerProxy.debug('[HITL] HITL tool generation complete', {
		totalHitlTools: sendAndWaitNodes.length,
	});
}
