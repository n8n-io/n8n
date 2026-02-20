import { tool } from '@langchain/core/tools';
import type { Logger } from 'n8n-workflow';
import { z } from 'zod';

import type { WorkflowMetadata } from '@/types';
import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getWorkflowState } from './helpers/state';
import { fetchAndFormatExpressionExamples } from './utils/expression-extraction.utils';
import {
	getNodeConfigurationsFromTemplates,
	formatNodeConfigurationExamples,
} from './utils/node-configuration.utils';
import { fetchWorkflowsFromTemplates } from './web/templates';

const nodeRequestSchema = z.object({
	nodeType: z.string().describe('The exact node type name (e.g., n8n-nodes-base.httpRequest)'),
	type: z
		.enum(['expressions', 'full'])
		.describe(
			'"expressions" fetches verified output field paths from downstream expressions in template workflows.' +
				'"full" returns full node parameter configuration examples from templates.',
		),
});

const getNodeExamplesSchema = z.object({
	nodes: z
		.array(nodeRequestSchema)
		.min(1)
		.max(10)
		.describe('List of nodes to get examples for (1-10 nodes)'),
});

export const GET_NODE_EXAMPLES_TOOL: BuilderToolBase = {
	toolName: 'get_node_examples',
	displayTitle: 'Fetching node examples',
};

/**
 * Fetch full node configuration examples for a single node type.
 * Checks state cache first, then fetches from templates API.
 */
async function fetchFullConfigExamples(
	nodeType: string,
	cachedTemplates: WorkflowMetadata[],
	logger?: Logger,
): Promise<{ formatted: string; newTemplates: WorkflowMetadata[] }> {
	const relevantFromCache = cachedTemplates.filter((wf) =>
		wf.workflow.nodes.some((n) => n.type === nodeType),
	);

	if (relevantFromCache.length > 0) {
		logger?.debug('Found templates in state cache for full config examples', {
			nodeType,
			workflowCount: relevantFromCache.length,
		});

		const configs = getNodeConfigurationsFromTemplates(relevantFromCache, nodeType);
		return {
			formatted: formatNodeConfigurationExamples(nodeType, configs),
			newTemplates: [],
		};
	}

	// Fetch from API
	try {
		const result = await fetchWorkflowsFromTemplates(
			{ nodes: nodeType, rows: 5 },
			{ maxTemplates: 5, logger },
		);

		if (result.workflows.length > 0) {
			const configs = getNodeConfigurationsFromTemplates(result.workflows, nodeType);
			logger?.debug('Fetched workflows from templates API for full config', {
				nodeType,
				configCount: configs.length,
				workflowCount: result.workflows.length,
			});

			return {
				formatted: formatNodeConfigurationExamples(nodeType, configs),
				newTemplates: result.workflows,
			};
		}
	} catch (error) {
		logger?.warn('Failed to fetch full config examples from templates', { nodeType, error });
	}

	return {
		formatted: formatNodeConfigurationExamples(nodeType, []),
		newTemplates: [],
	};
}

/**
 * Factory function to create the unified get node examples tool.
 * Fetches either expression examples or full node parameter configurations
 * from community templates, based on the `type` discriminator per node request.
 */
export function createGetNodeExamplesTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				GET_NODE_EXAMPLES_TOOL.toolName,
				GET_NODE_EXAMPLES_TOOL.displayTitle,
			);

			try {
				const { nodes } = getNodeExamplesSchema.parse(input);
				const state = getWorkflowState();

				reporter.start({ nodes });

				const cachedTemplates = state.cachedTemplates ?? [];
				const allNewTemplates: WorkflowMetadata[] = [];
				const sections: string[] = [];

				// Process expression requests together for efficiency (batch API)
				const expressionNodeTypes = nodes
					.filter((n) => n.type === 'expressions')
					.map((n) => n.nodeType);

				if (expressionNodeTypes.length > 0) {
					const result = await fetchAndFormatExpressionExamples(
						expressionNodeTypes,
						cachedTemplates,
						logger,
					);
					if (result.newTemplates.length > 0) {
						allNewTemplates.push(...result.newTemplates);
					}
					for (const nodeType of expressionNodeTypes) {
						const formatted = result.formatted[nodeType];
						if (formatted) {
							sections.push(formatted);
						}
					}
				}

				// Process full config requests individually
				const fullConfigNodes = nodes.filter((n) => n.type === 'full');
				for (const { nodeType } of fullConfigNodes) {
					const result = await fetchFullConfigExamples(
						nodeType,
						[...cachedTemplates, ...allNewTemplates],
						logger,
					);
					if (result.newTemplates.length > 0) {
						allNewTemplates.push(...result.newTemplates);
					}
					if (result.formatted) {
						sections.push(result.formatted);
					}
				}

				const stateUpdates: Record<string, unknown> = {};
				if (allNewTemplates.length > 0) {
					stateUpdates.cachedTemplates = allNewTemplates;
				}

				const summary =
					sections.length > 0
						? sections.join('\n\n')
						: `No examples found for: ${nodes.map((n) => n.nodeType).join(', ')}`;

				reporter.complete({ summary });
				return createSuccessResponse(
					config,
					summary,
					Object.keys(stateUpdates).length > 0 ? stateUpdates : undefined,
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Failed to fetch node examples';
				reporter.error(error instanceof Error ? error : new Error(message));
				return createErrorResponse(config, new Error(message));
			}
		},
		{
			name: GET_NODE_EXAMPLES_TOOL.toolName,
			description: `Fetch real-world examples for node types from community templates.
Each request specifies a type: "expressions" returns verified output field paths that downstream nodes
use when referencing this node (call BEFORE configuring nodes that need expressions).
This tool can also be used to demonstrate examples of how to wire data up e.g. binary results.
"full" returns complete parameter configuration examples showing how the node is typically set up.`,
			schema: getNodeExamplesSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_NODE_EXAMPLES_TOOL,
	};
}
