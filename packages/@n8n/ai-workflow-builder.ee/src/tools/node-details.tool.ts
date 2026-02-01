import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { MAX_NODE_EXAMPLE_CHARS } from '@/constants';
import type { NodeConfigurationEntry } from '@/types';
import {
	extractResourceOperations,
	formatResourceOperationsForPrompt,
	createResourceCacheKey,
	type ResourceOperationInfo,
} from '@/utils/resource-operation-extractor';
import type { BuilderToolBase } from '@/utils/stream-processor';

import { ValidationError, ToolExecutionError } from '../errors';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getWorkflowState } from './helpers/state';
import { findNodeType, createNodeTypeNotFoundError } from './helpers/validation';
import type { NodeDetails } from '../types/nodes';
import type { NodeDetailsOutput, WorkflowMetadata } from '../types/tools';
import { getNodeConfigurationsFromTemplates } from './utils/node-configuration.utils';
import { fetchWorkflowsFromTemplates } from './web/templates';

/** Maximum number of example configurations to include */
const MAX_NODE_EXAMPLES = 5;

/**
 * Schema for node details tool input
 */
const nodeDetailsSchema = z.object({
	nodeName: z.string().describe('The exact node type name (e.g., n8n-nodes-base.httpRequest)'),
	nodeVersion: z.number().describe('The exact node version'),
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
	examples: NodeConfigurationEntry[] = [],
	resourceOperationInfo?: ResourceOperationInfo | null,
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

	// Resource/Operation info (for nodes that follow this pattern)
	if (resourceOperationInfo) {
		parts.push(formatResourceOperationsForPrompt(resourceOperationInfo));
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

	// Example configurations from workflow examples (with token limit, max 5)
	if (examples.length > 0) {
		const limitedExamples = examples.slice(0, MAX_NODE_EXAMPLES);
		const { parts: exampleParts } = limitedExamples.reduce<{ parts: string[]; chars: number }>(
			(acc, config) => {
				const exampleStr = JSON.stringify(config.parameters, null, 2);
				if (acc.chars + exampleStr.length <= MAX_NODE_EXAMPLE_CHARS) {
					acc.parts.push(`<example>\n${exampleStr}\n</example>`);
					acc.chars += exampleStr.length;
				}
				return acc;
			},
			{ parts: [], chars: 0 },
		);

		if (exampleParts.length > 0) {
			parts.push('<node_examples>');
			parts.push(...exampleParts);
			parts.push('</node_examples>');
		}
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
 * Get example configurations for a node type.
 * First checks the cached templates, then fetches from templates API if none found.
 */
async function getNodeExamples(
	nodeName: string,
	nodeVersion: number,
	logger?: Logger,
	onProgress?: (message: string) => void,
): Promise<{
	examples: NodeConfigurationEntry[];
	newTemplates?: WorkflowMetadata[];
}> {
	// First, try to get examples from cached templates
	try {
		const state = getWorkflowState();
		const cachedTemplates = state?.cachedTemplates ?? [];

		// Extract configurations directly from cached templates
		const filteredConfigs = getNodeConfigurationsFromTemplates(
			cachedTemplates,
			nodeName,
			nodeVersion,
		);

		if (filteredConfigs.length > 0) {
			logger?.debug('Found node configurations in cached templates', {
				nodeName,
				nodeVersion,
				count: filteredConfigs.length,
			});
			return { examples: filteredConfigs };
		}
	} catch {
		// State may not be available in some environments
	}

	// No cached data, fetch from templates API
	onProgress?.(`Fetching examples for ${nodeName}...`);

	try {
		const result = await fetchWorkflowsFromTemplates(
			{ nodes: nodeName, rows: 10 },
			{ maxTemplates: 5, logger },
		);

		if (result.workflows.length > 0) {
			const nodeConfigs = getNodeConfigurationsFromTemplates(
				result.workflows,
				nodeName,
				nodeVersion,
			);

			logger?.debug('Fetched node configurations from templates API', {
				nodeName,
				nodeVersion,
				count: nodeConfigs.length,
				workflowCount: result.workflows.length,
			});

			return { examples: nodeConfigs, newTemplates: result.workflows };
		}
	} catch (error) {
		logger?.warn('Failed to fetch node examples from templates', { nodeName, error });
	}

	return { examples: [] };
}

/**
 * Factory function to create the node details tool
 */
export function createNodeDetailsTool(nodeTypes: INodeTypeDescription[], logger?: Logger) {
	const dynamicTool = tool(
		async (input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				NODE_DETAILS_TOOL.toolName,
				NODE_DETAILS_TOOL.displayTitle,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = nodeDetailsSchema.parse(input);
				const { nodeName, nodeVersion, withParameters, withConnections } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Report progress
				reportProgress(reporter, `Looking up details for ${nodeName}...`);

				// Find the node type
				const nodeType = findNodeType(nodeName, nodeVersion, nodeTypes);

				if (!nodeType) {
					const error = createNodeTypeNotFoundError(nodeName);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Extract node details
				const details = extractNodeDetails(nodeType);

				// Extract resource/operation info for nodes that follow this pattern
				const resourceOperationInfo = extractResourceOperations(nodeType, nodeVersion, logger);

				// Get example configurations (from cache or fetch from templates)
				const { examples, newTemplates } = await getNodeExamples(
					nodeName,
					nodeVersion,
					logger,
					(msg) => reportProgress(reporter, msg),
				);

				// Format the output message with examples and resource/operation info
				const message = formatNodeDetails(
					details,
					withParameters,
					withConnections,
					examples,
					resourceOperationInfo,
				);

				// Report completion
				const output: NodeDetailsOutput = {
					details,
					found: true,
					message,
				};
				reporter.complete(output);

				// Build state updates: cache resource operation info and new templates
				const cacheKey = createResourceCacheKey(nodeName, nodeVersion);
				const stateUpdates: Record<string, unknown> = {
					// Cache the resource operation info (including null for nodes without resources)
					resourceOperationCache: { [cacheKey]: resourceOperationInfo },
				};

				// Add new templates if fetched
				if (newTemplates) {
					stateUpdates.cachedTemplates = newTemplates;
				}

				return createSuccessResponse(config, message, stateUpdates);
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
				'Get detailed information about a specific n8n node type including properties, available connections, and up to 5 example configurations. Use this before adding nodes to understand their input/output structure.',
			schema: nodeDetailsSchema,
		},
	);

	return {
		tool: dynamicTool,
		...NODE_DETAILS_TOOL,
	};
}
