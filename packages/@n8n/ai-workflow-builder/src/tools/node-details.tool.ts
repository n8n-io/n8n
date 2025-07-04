import type { INodeTypeDescription } from 'n8n-workflow';

import { BaseWorkflowBuilderTool, z, type ToolContext, type ToolResult } from './base';
import { type NodeDetails, extractNodeDetails } from './types/node.types';

/**
 * Schema for node details tool input
 */
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
		.default(true)
		.describe('Whether to include node supported connections in the output'),
});

/**
 * Inferred type from schema
 */
type NodeDetailsInput = z.infer<typeof nodeDetailsSchema>;

/**
 * Output type for the node details tool
 */
interface NodeDetailsOutput {
	details: NodeDetails;
	found: boolean;
	message: string;
}

/**
 * Node details tool implementation using the base infrastructure
 */
export class NodeDetailsTool extends BaseWorkflowBuilderTool<
	typeof nodeDetailsSchema,
	NodeDetailsOutput
> {
	protected readonly schema = nodeDetailsSchema;
	protected readonly name = 'get_node_details' as const;
	protected readonly description =
		'Get detailed information about a specific n8n node type including properties and available connections. Use this before adding nodes to understand their input/output structure.';

	/**
	 * Execute the node details tool
	 */
	protected async execute(
		input: NodeDetailsInput,
		context: ToolContext,
	): Promise<ToolResult<NodeDetailsOutput>> {
		const { nodeName, withParameters, withConnections } = input;

		// Report progress
		context.reporter.progress(`Looking up details for ${nodeName}...`);

		// Find the node type
		const nodeType = context.nodeTypes.find((nt) => nt.name === nodeName);

		if (!nodeType) {
			return {
				success: false,
				error: {
					message: `Node type "${nodeName}" not found`,
					code: 'NODE_NOT_FOUND',
					details: { nodeName },
				},
			};
		}

		// Extract node details
		const details = extractNodeDetails(nodeType);

		// Format the output message
		const message = this.formatNodeDetails(details, withParameters, withConnections);

		return {
			success: true,
			data: {
				details,
				found: true,
				message,
			},
		};
	}

	/**
	 * Format node details into a structured message
	 */
	private formatNodeDetails(
		details: NodeDetails,
		withParameters: boolean = false,
		withConnections: boolean = true,
	): string {
		const parts: string[] = [];

		// Basic details
		parts.push('<node_details>');
		parts.push(`<name>${details.name}</name>`);
		parts.push(`<display_name>${details.displayName}</display_name>`);
		parts.push(`<description>${details.description}</description>`);

		if (details.subtitle) {
			parts.push(`  <subtitle>${details.subtitle}</subtitle>`);
		}

		// Parameters
		if (withParameters && details.properties.length > 0) {
			parts.push('<properties>');
			for (const prop of details.properties) {
				parts.push(`<property>${JSON.stringify(prop)}</property>`);
			}
			parts.push('</properties>');
		}

		// Connections
		if (withConnections) {
			parts.push('<connections>');
			parts.push(this.formatInputs(details.inputs));
			parts.push(this.formatOutputs(details.outputs));
			parts.push('</connections>');
		}

		parts.push('</node_details>');

		return parts.join('\n');
	}

	/**
	 * Format node inputs
	 */
	private formatInputs(inputs: INodeTypeDescription['inputs']): string {
		if (!inputs || inputs.length === 0) {
			return '<inputs>none</inputs>';
		}
		if (typeof inputs === 'string') {
			return `<input>${inputs}</input>`;
		}
		const formattedInputs = inputs.map((input) => {
			if (typeof input === 'string') {
				return `<input>${input}</input>`;
			}

			return `<input>${JSON.stringify(input)}</input>`;
		});
		return formattedInputs.join('\n');
	}

	/**
	 * Format node outputs
	 */
	private formatOutputs(outputs: INodeTypeDescription['outputs']): string {
		if (!outputs || outputs.length === 0) {
			return '<outputs>none</outputs>';
		}
		if (typeof outputs === 'string') {
			return `<output>${outputs}</output>`;
		}
		const formattedOutputs = outputs.map((output) => {
			if (typeof output === 'string') {
				return `<output>${output}</output>`;
			}

			return `<output>${JSON.stringify(output)}</output>`;
		});
		return formattedOutputs.join('\n');
	}

	/**
	 * Override to provide custom success message
	 */
	protected formatSuccessMessage(output: NodeDetailsOutput): string {
		return output.message;
	}
}

/**
 * Factory function to create the node details tool
 * Maintains backward compatibility with existing code
 */
export function createNodeDetailsTool(nodeTypes: INodeTypeDescription[]) {
	const tool = new NodeDetailsTool(nodeTypes);
	return tool.createLangChainTool();
}
