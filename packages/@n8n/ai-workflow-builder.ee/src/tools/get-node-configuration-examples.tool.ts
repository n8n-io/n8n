import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import type { NodeConfigurationsMap } from '@/types';
import type { BuilderToolBase } from '@/utils/stream-processor';

import { ValidationError, ToolExecutionError } from '../errors';
import {
	createProgressReporter,
	createSuccessResponse,
	createErrorResponse,
	getWorkflowState,
} from './helpers';
import { reportProgress } from './helpers/progress';
import {
	collectNodeConfigurationsFromWorkflows,
	formatNodeConfigurationExamples,
} from './utils/node-configuration.utils';
import { fetchWorkflowsFromTemplates } from './web/templates';

/**
 * Schema for get node configuration examples tool input
 */
const getNodeConfigurationExamplesSchema = z.object({
	nodeType: z.string().describe('The exact node type name (e.g., n8n-nodes-base.httpRequest)'),
	nodeVersion: z
		.number()
		.optional()
		.describe('Optional specific node version to filter examples by'),
});

export const GET_NODE_CONFIGURATION_EXAMPLES_TOOL: BuilderToolBase = {
	toolName: 'get_node_configuration_examples',
	displayTitle: 'Getting node configuration examples',
};

const TOOL_DESCRIPTION = `Get real-world configuration examples for a specific node type from community templates.

Use this tool when you need reference examples for configuring node parameters:
- Before configuring nodes with complex parameters
- When you need to understand proper parameter structure
- To see how community workflows configure specific integrations

Parameters:
- nodeType: The exact node type (e.g., "n8n-nodes-base.httpRequest")
- nodeVersion: Optional version number to filter examples

Returns XML-formatted examples showing proven parameter configurations.`;

/**
 * Factory function to create the get node configuration examples tool
 */
export function createGetNodeConfigurationExamplesTool(logger?: Logger) {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				GET_NODE_CONFIGURATION_EXAMPLES_TOOL.toolName,
				GET_NODE_CONFIGURATION_EXAMPLES_TOOL.displayTitle,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = getNodeConfigurationExamplesSchema.parse(input);
				const { nodeType, nodeVersion } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// First, check state for existing configurations from discovery
				let configurations: NodeConfigurationsMap = {};
				try {
					const state = getWorkflowState();
					configurations = state?.nodeConfigurations ?? {};
				} catch {
					// State may not be available in some contexts
				}

				let nodeConfigs = configurations[nodeType] ?? [];

				// If no configs found in state, fetch from templates API
				if (nodeConfigs.length === 0) {
					reportProgress(reporter, `Fetching examples for ${nodeType} from templates...`);

					try {
						// Search for templates that use this node type
						const result = await fetchWorkflowsFromTemplates(
							{ nodes: nodeType, rows: 10 },
							{ maxTemplates: 5, logger },
						);

						// Extract node configurations from fetched workflows
						if (result.workflows.length > 0) {
							configurations = collectNodeConfigurationsFromWorkflows(result.workflows);
							nodeConfigs = configurations[nodeType] ?? [];

							logger?.debug('Collected node configurations from templates', {
								nodeType,
								configCount: nodeConfigs.length,
								templateCount: result.workflows.length,
							});
						}
					} catch (error) {
						logger?.warn('Failed to fetch node configuration examples from templates', {
							nodeType,
							error,
						});
					}
				}

				// Format the response
				const message = formatNodeConfigurationExamples(nodeType, nodeConfigs, nodeVersion);

				reporter.complete({
					nodeType,
					totalFound: nodeConfigs.length,
					message,
				});

				// Return with state update to cache the configurations for reuse
				return createSuccessResponse(config, message, {
					nodeConfigurations: configurations,
				});
			} catch (error) {
				// Handle validation errors
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				// Handle execution errors
				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error occurred',
					{
						toolName: GET_NODE_CONFIGURATION_EXAMPLES_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_NODE_CONFIGURATION_EXAMPLES_TOOL.toolName,
			description: TOOL_DESCRIPTION,
			schema: getNodeConfigurationExamplesSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_NODE_CONFIGURATION_EXAMPLES_TOOL,
	};
}
