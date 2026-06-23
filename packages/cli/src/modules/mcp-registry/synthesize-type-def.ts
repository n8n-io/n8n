import { generateNodeTypeFile } from '@n8n/workflow-sdk';
import type { NodeTypeDescription as SdkNodeTypeDescription } from '@n8n/workflow-sdk';
import type { INodeTypeDescription } from 'n8n-workflow';

/**
 * Generate TypeScript type-definition content for an in-memory node
 * description by running it through the SDK's standard generator. The output
 * shape matches the on-disk `dist/node-definitions/` files produced for
 * built-in nodes at build time, so consumers (MCP `get_node_types`, Instance
 * AI's `type-definition`) treat synthesized and on-disk defs identically.
 *
 * Used for nodes that have no on-disk artifact: MCP registry servers, custom
 * nodes (`N8N_CUSTOM_EXTENSIONS` / `~/.n8n/custom`) and community packages.
 *
 * Hidden properties (e.g. pre-configured connection details) are stripped
 * before generation so the agent's schema only surfaces parameters it is
 * meant to set.
 *
 * Throws when the description cannot be expressed as an SDK type (e.g. nodes
 * with expression-computed inputs/outputs). Callers batching multiple nodes
 * should catch and degrade gracefully rather than failing the whole request.
 */
export function synthesizeNodeTypeDef(description: INodeTypeDescription): string {
	const visibleDescription = {
		...description,
		properties: description.properties.filter((property) => property.type !== 'hidden'),
	};

	if (!isSdkNodeTypeDescription(visibleDescription)) {
		throw new Error(`Cannot synthesize type definition for ${description.name}`);
	}

	return generateNodeTypeFile(visibleDescription);
}

function isSdkNodeTypeDescription(
	description: INodeTypeDescription,
): description is INodeTypeDescription & SdkNodeTypeDescription {
	return (
		Array.isArray(description.group) &&
		Array.isArray(description.properties) &&
		typeof description.inputs !== 'string' &&
		typeof description.outputs !== 'string' &&
		hasSdkConnections(description.inputs) &&
		hasSdkConnections(description.outputs) &&
		hasSdkCredentials(description.credentials)
	);
}

function hasSdkConnections(
	connections: INodeTypeDescription['inputs'] | INodeTypeDescription['outputs'],
): connections is (INodeTypeDescription['inputs'] | INodeTypeDescription['outputs']) &
	SdkNodeTypeDescription['inputs'] {
	return (
		Array.isArray(connections) &&
		connections.every(
			(connection) =>
				typeof connection === 'string' ||
				(typeof connection.type === 'string' &&
					(connection.displayName === undefined || typeof connection.displayName === 'string')),
		)
	);
}

function hasSdkCredentials(
	credentials: INodeTypeDescription['credentials'],
): credentials is SdkNodeTypeDescription['credentials'] {
	return (
		credentials === undefined ||
		credentials.every(
			(credential) =>
				typeof credential.name === 'string' &&
				(credential.required === undefined || typeof credential.required === 'boolean'),
		)
	);
}
