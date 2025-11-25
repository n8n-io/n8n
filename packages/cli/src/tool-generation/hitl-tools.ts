import type { Types } from 'n8n-core';
import type {
	INodeProperties,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	KnownNodesAndCredentials,
} from 'n8n-workflow';
import { deepCopy, NodeConnectionTypes, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { copyCredentialSupport, isFullDescription, setToolCodex } from './utils';

/**
 * Check if a node has a sendAndWait operation.
 * A node is considered to have sendAndWait if:
 * 1. It has webhooks configured (sendAndWait uses webhooks for the response)
 * 2. It has an 'operation' property with 'sendAndWait' as an option
 */
export function hasSendAndWaitOperation(nodeType: INodeTypeDescription): boolean {
	// Must have webhooks configured
	if (!nodeType.webhooks || nodeType.webhooks.length === 0) return false;

	// Must have an operation property with sendAndWait option
	const operationProp = nodeType.properties.find((p) => p.name === 'operation');
	if (!operationProp || !Array.isArray(operationProp.options)) return false;

	return operationProp.options.some(
		(opt) => typeof opt === 'object' && 'value' in opt && opt.value === SEND_AND_WAIT_OPERATION,
	);
}

/**
 * Filter properties to only include those relevant for HITL tool operation.
 * Removes resource/operation selectors and keeps only sendAndWait-related properties.
 */
function filterHitlToolProperties(
	properties: INodeProperties[],
	originalDisplayName: string,
): INodeProperties[] {
	const filtered: INodeProperties[] = [];

	// Add tool description as first property
	filtered.push({
		displayName: 'Tool Description',
		name: 'toolDescription',
		type: 'string',
		default: `Request human approval via ${originalDisplayName} before executing the tool`,
		required: true,
		typeOptions: { rows: 2 },
		description:
			'Explain to the LLM what this HITL tool does. The agent will know that tools connected to this node require human approval.',
	});

	for (const prop of properties) {
		// Skip resource selector - we only care about sendAndWait
		if (prop.name === 'resource') continue;

		// Skip operation selector - force to sendAndWait
		if (prop.name === 'operation') continue;

		// Skip response type - HITL only uses approval (approve/deny)
		if (prop.name === 'responseType') continue;

		// Skip approval options customization for now (simplified flow)
		if (prop.name === 'approvalOptions') continue;

		// Keep properties shown for sendAndWait operation
		if (prop.displayOptions?.show?.operation) {
			const ops = prop.displayOptions.show.operation;
			if (Array.isArray(ops) && ops.includes(SEND_AND_WAIT_OPERATION)) {
				// Clone and remove the operation display condition since we force sendAndWait
				const cloned = deepCopy(prop);
				if (cloned.displayOptions?.show?.operation) {
					delete cloned.displayOptions.show.operation;
					// Clean up empty displayOptions
					if (Object.keys(cloned.displayOptions.show).length === 0) {
						delete cloned.displayOptions.show;
					}
					if (cloned.displayOptions && Object.keys(cloned.displayOptions).length === 0) {
						delete cloned.displayOptions;
					}
				}
				filtered.push(cloned);
				continue;
			}
			// Skip properties for other operations
			continue;
		}

		// Keep properties that don't have resource-specific display options
		// (authentication, credentials config, etc.)
		if (!prop.displayOptions?.show?.resource) {
			filtered.push(deepCopy(prop));
		}
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
		item.description.displayName = `${originalDisplayName} HITL Tool`;

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
	const sendAndWaitNodes = types.nodes.filter(hasSendAndWaitOperation);

	for (const sendAndWaitNode of sendAndWaitNodes) {
		const description = deepCopy(sendAndWaitNode);
		const wrapped = convertNodeToHitlTool({ description }).description;

		// Add to node types
		types.nodes.push(wrapped);

		// Point to original node's class - execution engine handles HITL-specific behavior
		// by detecting nodes with 'HitlTool' suffix
		known.nodes[wrapped.name] = { ...known.nodes[sendAndWaitNode.name] };

		copyCredentialSupport(known, sendAndWaitNode.name, wrapped.name);
	}
}
