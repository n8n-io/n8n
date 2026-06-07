import { generateNodeTypeFile } from '@n8n/workflow-sdk';
import type { NodeTypeDescription as SdkNodeTypeDescription } from '@n8n/workflow-sdk';
import type { INodeTypeDescription } from 'n8n-workflow';

/**
 * Generate TypeScript type-definition content for a synthetic MCP registry
 * node by running its in-memory description through the SDK's standard
 * generator. The output shape matches the on-disk `dist/node-definitions/`
 * files produced for native nodes at build time, so consumers
 * (Agent Builder's `get_node_types`, Instance AI's `type-definition`) can
 * treat it identically.
 *
 * Hidden properties (pre-configured connection details like the endpoint
 * URL and server transport) are stripped before generation so the agent's
 * schema only surfaces parameters the agent is meant to set.
 */
export function synthesizeMcpRegistryTypeDef(description: INodeTypeDescription): string {
	const visibleDescription = {
		...description,
		properties: description.properties.filter((property) => property.type !== 'hidden'),
	};

	if (!isSdkNodeTypeDescription(visibleDescription)) {
		throw new Error(`Cannot synthesize MCP registry type definition for ${description.name}`);
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
