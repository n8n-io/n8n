import type { Types } from 'n8n-core';
import type {
	IExecuteFunctions,
	INodeProperties,
	INodeType,
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
	sendAndWaitResource: string | undefined,
): INodeProperties[] {
	const filtered: INodeProperties[] = [];

	// Add message property with expression support for tool information
	filtered.push({
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '=The agent wants to call {{ $tool.name }}',
		required: true,
		typeOptions: { rows: 3 },
		description:
			'Message to send for approval. Use expressions to include tool details: {{ $tool.parameters }}, {{ $json.toolCallId }}',
	});

	for (const prop of properties) {
		// Convert resource to hidden property with the sendAndWait resource as default
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

		// Skip original message property - we add our own with HITL-specific default
		if (prop.name === 'message') {
			continue;
		}

		// Convert to hidden property and keep 'approval' by default
		if (prop.name === 'responseType') {
			filtered.push({
				displayName: 'Response Type',
				name: 'responseType',
				type: 'hidden',
				default: 'approval',
			});
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
		const sendAndWaitResource = findSendAndWaitResource(item.description.properties);

		// Naming convention: slackHitlTool, emailSendHitlTool, etc.
		item.description.name += 'HitlTool';
		item.description.displayName = originalDisplayName; // Just the service name (e.g., "Slack")
		item.description.subtitle = 'Send and wait';
		item.description.description = 'Request human approval for tools';

		// Set defaults.name to displayName so node name on canvas is "Slack" not auto-generated
		item.description.defaults = {
			...item.description.defaults,
			name: originalDisplayName,
		};

		// Skip resource/operation-based name generation (e.g., "SendAndWait message in Slack")
		item.description.skipNameGeneration = true;

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
				displayName: 'Human review',
				type: NodeConnectionTypes.AiTool,
				filter: {
					nodes: ['@n8n/n8n-nodes-langchain.agent', '@n8n/n8n-nodes-langchain.agentTool'],
				},
			},
		];

		// Filter and adjust properties for HITL use case
		item.description.properties = filterHitlToolProperties(
			item.description.properties,
			sendAndWaitResource,
		);

		// Keep webhooks - original node's webhook handler will be used
		// The execution engine handles HITL-specific behavior
	}

	setToolCodex(item.description, 'Human in the Loop');

	// Wrap the execute method to ensure proper ai_tool logging
	const nodeItem = item as unknown as INodeType;
	if (nodeItem.execute) {
		// eslint-disable-next-line @typescript-eslint/unbound-method
		const originalExecute = nodeItem.execute;
		nodeItem.execute = async function (this: IExecuteFunctions) {
			const node = this.getNode();

			// Ensure output is logged with ai_tool connection type
			// This makes the HITL node appear in the Agent's logs panel
			node.rewireOutputLogTo = NodeConnectionTypes.AiTool;

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return await originalExecute.call(this);
		};
	}

	return item;
}

/**
 * Generate HITL tool variants for all nodes with sendAndWait operations.
 * Called during node loading to create HITL tool nodes automatically.
 *
 * The generated HITL tools use the EngineRequest pattern:
 * 1. Agent calls HITL tool → returns EngineRequest
 * 2. Engine executes HITL node → sendAndWait → waiting state
 * 3. Webhook resumes → Agent gets approval result
 * 4. If approved, Agent calls gated tool
 */
export function createHitlTools(types: Types, known: KnownNodesAndCredentials): void {
	const sendAndWaitNodes = types.nodes.filter(hasSendAndWaitOperation);

	for (const sendAndWaitNode of sendAndWaitNodes) {
		const description = deepCopy(sendAndWaitNode);
		const wrapped = convertNodeToHitlTool({ description }).description;

		types.nodes.push(wrapped);

		known.nodes[wrapped.name] = {
			...known.nodes[sendAndWaitNode.name],
		};

		copyCredentialSupport(known, sendAndWaitNode.name, wrapped.name);
	}
}
