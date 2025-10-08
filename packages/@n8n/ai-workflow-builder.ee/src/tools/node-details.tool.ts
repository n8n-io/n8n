import { tool } from '@langchain/core/tools';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderToolBase } from '@/utils/stream-processor';

import { ValidationError, ToolExecutionError } from '../errors';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { findNodeType, createNodeTypeNotFoundError } from './helpers/validation';
import type { NodeDetails } from '../types/nodes';
import type { NodeDetailsOutput } from '../types/tools';

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
 * Format node inputs
 */
function formatInputs(inputs: INodeTypeDescription['inputs']): string {
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
function formatOutputs(outputs: INodeTypeDescription['outputs']): string {
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
 * Format node details into a structured message
 */
function formatNodeDetails(
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
		parts.push(`<subtitle>${details.subtitle}</subtitle>`);
	}

	// Parameters
	if (withParameters && details.properties.length > 0) {
		const stringifiedProperties = JSON.stringify(details.properties, null, 2);
		parts.push(`<properties>
			${stringifiedProperties.length > 1000 ? stringifiedProperties.slice(0, 1000) + '... Rest of properties omitted' : stringifiedProperties}
			</properties>`);
	}

	// Connections
	if (withConnections) {
		parts.push('<connections>');
		parts.push(formatInputs(details.inputs));
		parts.push(formatOutputs(details.outputs));
		parts.push('</connections>');
	}

	parts.push('</node_details>');

	return parts.join('\n');
}

/**
 * Helper to extract node details from a node type description
 */
function extractNodeDetails(nodeType: INodeTypeDescription): NodeDetails {
	return {
		name: nodeType.name,
		displayName: nodeType.displayName,
		description: nodeType.description,
		properties: nodeType.properties,
		subtitle: nodeType.subtitle,
		inputs: nodeType.inputs,
		outputs: nodeType.outputs,
	};
}

export const NODE_DETAILS_TOOL: BuilderToolBase = {
	toolName: 'get_node_details',
	displayTitle: 'Getting node details',
};

/**
 * Factory function to create the node details tool
 */
export function createNodeDetailsTool(nodeTypes: INodeTypeDescription[]) {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				NODE_DETAILS_TOOL.toolName,
				NODE_DETAILS_TOOL.displayTitle,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = nodeDetailsSchema.parse(input);
				const { nodeName, withParameters, withConnections } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Report progress
				reportProgress(reporter, `Looking up details for ${nodeName}...`);

				// Find the node type
				const nodeType = findNodeType(nodeName, nodeTypes);

				if (!nodeType) {
					const error = createNodeTypeNotFoundError(nodeName);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Extract node details
				const details = extractNodeDetails(nodeType);

				// Format the output message
				const message = formatNodeDetails(details, withParameters, withConnections);

				// Report completion
				const output: NodeDetailsOutput = {
					details,
					found: true,
					message,
				};
				reporter.complete(output);

				// Return success response
				return createSuccessResponse(config, message);
			} catch (error) {
				// Handle validation or unexpected errors
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error occurred',
					{
						toolName: NODE_DETAILS_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: NODE_DETAILS_TOOL.toolName,
			description:
				'Get detailed information about a specific n8n node type including properties and available connections. Use this before adding nodes to understand their input/output structure.',
			schema: nodeDetailsSchema,
		},
	);

	return {
		tool: dynamicTool,
		...NODE_DETAILS_TOOL,
	};
}
