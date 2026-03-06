import type { User } from '@n8n/db';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

import type { Telemetry } from '@/telemetry';

const inputSchema = {
	nodeType: z.string().describe('The node type name (e.g., "n8n-nodes-base.httpRequest")'),
	nodeVersion: z
		.number()
		.optional()
		.describe('Specific version of the node. If not provided, returns the latest version.'),
} satisfies z.ZodRawShape;

const nodePropertySchema = z
	.custom<INodeProperties>((_value): _value is INodeProperties => true)
	.describe('A node property definition');

const outputSchema = {
	nodeType: z
		.object({
			name: z.string().describe('The node type identifier'),
			displayName: z.string().describe('The human-readable name of the node'),
			description: z.string().describe('A description of what the node does'),
			version: z.number().describe('The version of the node type'),
			properties: z.array(nodePropertySchema).describe('The parameter definitions for this node'),
			inputs: z.custom<INodeTypeDescription['inputs']>().describe('The input connections'),
			outputs: z.custom<INodeTypeDescription['outputs']>().describe('The output connections'),
			subtitle: z.string().optional().describe('The subtitle template for the node'),
		})
		.passthrough()
		.describe('Detailed information about the node type'),
} satisfies z.ZodRawShape;

type NodeDetailsResult = {
	nodeType: {
		name: string;
		displayName: string;
		description: string;
		version: number;
		properties: INodeProperties[];
		inputs: INodeTypeDescription['inputs'];
		outputs: INodeTypeDescription['outputs'];
		subtitle?: string;
	};
};

/**
 * Creates MCP tool definition for retrieving detailed information about a specific node type,
 * including its parameters, inputs, and outputs.
 */
export const createGetNodeDetailsTool = (
	user: User,
	nodeTypes: INodeTypeDescription[],
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'get_node_details',
		config: {
			description:
				'Get detailed information about a specific n8n node type including its parameters, inputs, and outputs. Use this after search_nodes to understand how to configure a node.',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Get Node Details',
				readOnlyHint: true,
				idempotentHint: true,
			},
		},
		handler: async ({
			nodeType,
			nodeVersion,
		}: {
			nodeType: string;
			nodeVersion?: number;
		}) => {
			const parameters = { nodeType, nodeVersion };
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: 'get_node_details',
				parameters,
			};

			try {
				const payload = getNodeDetails(nodeTypes, { nodeType, nodeVersion });

				telemetryPayload.results = {
					success: true,
					data: {
						node_type: nodeType,
						node_version: payload.nodeType.version,
					},
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return {
					structuredContent: payload,
					content: [
						{
							type: 'text',
							text: JSON.stringify(payload),
						},
					],
				};
			} catch (error) {
				telemetryPayload.results = {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				throw error;
			}
		},
	};
};

export function getNodeDetails(
	nodeTypes: INodeTypeDescription[],
	{ nodeType, nodeVersion }: { nodeType: string; nodeVersion?: number },
): NodeDetailsResult {
	const matchingNodeTypes = nodeTypes.filter((nt) => nt.name === nodeType);

	if (matchingNodeTypes.length === 0) {
		throw new UserError('Node type not found');
	}

	let selectedNodeType: INodeTypeDescription;

	if (nodeVersion !== undefined) {
		const matchingVersion = matchingNodeTypes.find((nt) => {
			const versions = Array.isArray(nt.version) ? nt.version : [nt.version];
			return versions.includes(nodeVersion);
		});

		if (!matchingVersion) {
			const availableVersions = matchingNodeTypes.flatMap((nt) =>
				Array.isArray(nt.version) ? nt.version : [nt.version],
			);
			throw new UserError(
				`Version ${nodeVersion} not found for node type "${nodeType}". Available versions: ${availableVersions.join(', ')}`,
			);
		}

		selectedNodeType = matchingVersion;
	} else {
		// Pick the node type with the highest version (latest)
		selectedNodeType = matchingNodeTypes.reduce((latest, current) => {
			const latestMaxVersion = Array.isArray(latest.version)
				? Math.max(...latest.version)
				: latest.version;
			const currentMaxVersion = Array.isArray(current.version)
				? Math.max(...current.version)
				: current.version;
			return currentMaxVersion > latestMaxVersion ? current : latest;
		});
	}

	const resolvedVersion = Array.isArray(selectedNodeType.version)
		? Math.max(...selectedNodeType.version)
		: selectedNodeType.version;

	return {
		nodeType: {
			name: selectedNodeType.name,
			displayName: selectedNodeType.displayName,
			description: selectedNodeType.description,
			version: nodeVersion ?? resolvedVersion,
			properties: selectedNodeType.properties,
			inputs: selectedNodeType.inputs,
			outputs: selectedNodeType.outputs,
			subtitle: selectedNodeType.subtitle,
		},
	};
}
