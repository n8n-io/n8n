/**
 * Simplified Node Get Tool for One-Shot Workflow Code Agent
 *
 * Provides detailed information about a specific node type.
 * Returns parameter definitions and connection info for configuring the node.
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { NodeTypeParser } from '../utils/node-type-parser';

/**
 * Format node inputs for display
 */
function formatInputs(inputs: unknown): string {
	if (!inputs) {
		return 'none';
	}
	if (typeof inputs === 'string') {
		return inputs;
	}
	if (Array.isArray(inputs)) {
		return inputs
			.map((input) => {
				if (typeof input === 'string') {
					return input;
				}
				return JSON.stringify(input);
			})
			.join(', ');
	}
	return JSON.stringify(inputs);
}

/**
 * Format node outputs for display
 */
function formatOutputs(outputs: unknown): string {
	if (!outputs) {
		return 'none';
	}
	if (typeof outputs === 'string') {
		return outputs;
	}
	if (Array.isArray(outputs)) {
		return outputs
			.map((output) => {
				if (typeof output === 'string') {
					return output;
				}
				return JSON.stringify(output);
			})
			.join(', ');
	}
	return JSON.stringify(outputs);
}

/**
 * Create the simplified node get tool for one-shot agent
 */
export function createOneShotNodeGetTool(nodeTypeParser: NodeTypeParser) {
	return tool(
		async (input: { nodeId: string }) => {
			const nodeType = nodeTypeParser.getNodeType(input.nodeId);

			if (!nodeType) {
				return `Node type '${input.nodeId}' not found. Use search_node to find the correct node ID.`;
			}

			const parts: string[] = [];

			// Basic info
			parts.push(`Node: ${nodeType.name}`);
			parts.push(`Display Name: ${nodeType.displayName}`);
			parts.push(`Version: ${nodeType.version}`);
			parts.push(`Description: ${nodeType.description}`);

			// Connection info
			parts.push(`\nConnections:`);
			parts.push(`  Inputs: ${formatInputs(nodeType.inputs)}`);
			parts.push(`  Outputs: ${formatOutputs(nodeType.outputs)}`);

			// Parameters (limited to avoid token overflow)
			if (nodeType.properties && nodeType.properties.length > 0) {
				parts.push(`\nParameters (${nodeType.properties.length} total):`);

				// Show first 10 parameters
				const paramsToShow = nodeType.properties.slice(0, 10);
				for (const prop of paramsToShow) {
					const required = prop.required ? ' [REQUIRED]' : '';
					const defaultVal =
						prop.default !== undefined ? ` (default: ${JSON.stringify(prop.default)})` : '';
					parts.push(`  - ${prop.name}${required}: ${prop.type}${defaultVal}`);
					if (prop.description) {
						parts.push(`    ${prop.description}`);
					}
				}

				if (nodeType.properties.length > 10) {
					parts.push(`  ... and ${nodeType.properties.length - 10} more parameters`);
				}
			}

			// Subtitle hint
			if (nodeType.subtitle) {
				parts.push(`\nSubtitle: ${nodeType.subtitle}`);
			}

			return parts.join('\n');
		},
		{
			name: 'get_node',
			description:
				'Get detailed information about a specific node type including parameters, inputs, and outputs. Use this when you need to know how to configure a node or what connections it supports.',
			schema: z.object({
				nodeId: z.string().describe('The node ID (e.g., "n8n-nodes-base.httpRequest")'),
			}),
		},
	);
}
