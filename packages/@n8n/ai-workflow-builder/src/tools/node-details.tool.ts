import { ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { Command } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

export interface NodeDetails {
	name: string;
	displayName: string;
	description: string;
	properties: any[];
	subtitle?: string;
	inputs: INodeTypeDescription['inputs'];
	outputs: INodeTypeDescription['outputs'];
}

const nodeDetailsSchema = z.object({
	nodeName: z.string().describe('The exact node type name (e.g., n8n-nodes-base.httpRequest)'),
	withParameters: z
		.boolean()
		.optional()
		.default(false)
		.describe('Whether to include node parameters in the output'),
	withConnections: z
		.boolean()
		.optional()
		.default(false)
		.describe('Whether to include node supported connections in the output'),
});

export const createNodeDetailsTool = (nodeTypes: INodeTypeDescription[]) => {
	return tool(
		async (input, config) => {
			const { nodeName } = input;
			const nodeType = nodeTypes.find((nt) => nt.name === nodeName);

			if (!nodeType) {
				return new Command({
					update: {
						messages: [
							new ToolMessage({
								content: `Node type "${nodeName}" not found. Please search for available nodes first.`,
								tool_call_id: config.toolCall?.id,
							}),
						],
					},
				});
			}

			const details = extractNodeDetails(nodeType);
			const detailsMessage = formatNodeDetails(
				details,
				input.withParameters,
				input.withConnections,
			);

			return new Command({
				update: {
					messages: [
						new ToolMessage({
							content: detailsMessage,
							tool_call_id: config.toolCall?.id,
						}),
					],
				},
			});
		},
		{
			name: 'get_node_details',
			description:
				'Get detailed information about a specific n8n node type including properties and available connections',
			schema: nodeDetailsSchema,
		},
	);
};

function extractNodeDetails(nodeType: INodeTypeDescription): NodeDetails {
	// Extract connection types from inputs/outputs
	// const connectionTypes = extractConnectionTypes(nodeType);

	return {
		name: nodeType.name,
		displayName: nodeType.displayName,
		description: nodeType.description,
		inputs: nodeType.inputs,
		outputs: nodeType.outputs,
		properties: nodeType.properties,
		// connectionTypes,
	};
}

function formatNodeDetails(
	details: NodeDetails,
	withParameters = false,
	withConnections = false,
): string {
	let output = `
		<name>${details.name}</name>
		<display_name>${details.displayName}</display_name>
		<description>${details.description}</description>
	`;

	if (withParameters) {
		output += `\n<properties>${details.properties.map((prop) => `<property>${JSON.stringify(prop)}</property>`).join('')}</properties>`;
	}

	if (withConnections) {
		output += `
		<inputs>${details.inputs}</inputs>
		<outputs>${details.outputs}</outputs>
		`;
	}

	return `
	<node_details>
		${output}
	</node_details>
	`;
}
