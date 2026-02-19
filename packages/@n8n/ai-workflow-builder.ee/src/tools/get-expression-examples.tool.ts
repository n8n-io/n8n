import { tool } from '@langchain/core/tools';
import type { Logger } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getWorkflowState } from './helpers/state';
import { fetchAndFormatExpressionExamples } from './utils/expression-extraction.utils';

const getExpressionExamplesSchema = z.object({
	nodeTypes: z
		.array(z.string())
		.min(1)
		.describe(
			'Node types to fetch expression examples for. Use the full type name, e.g. ["n8n-nodes-base.jiraTrigger", "n8n-nodes-base.hubspotTrigger"]',
		),
});

export const GET_EXPRESSION_EXAMPLES_TOOL: BuilderToolBase = {
	toolName: 'get_expression_examples',
	displayTitle: 'Fetching expression examples',
};

/**
 * Factory function to create the get expression examples tool.
 * Fetches real-world expression patterns from community templates for the
 * given node types and stores them in state so the parameter updater chain
 * can reference them when configuring downstream nodes.
 */
export function createGetExpressionExamplesTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				GET_EXPRESSION_EXAMPLES_TOOL.toolName,
				GET_EXPRESSION_EXAMPLES_TOOL.displayTitle,
			);

			try {
				const { nodeTypes } = getExpressionExamplesSchema.parse(input);
				const state = getWorkflowState();

				reporter.start({ nodeTypes });

				const cachedTemplates = state.cachedTemplates ?? [];
				const result = await fetchAndFormatExpressionExamples(nodeTypes, cachedTemplates, logger);

				const stateUpdates: Record<string, unknown> = {};
				if (result.newTemplates.length > 0) {
					stateUpdates.cachedTemplates = result.newTemplates;
				}

				const formattedValues = Object.values(result.formatted);
				const summary =
					formattedValues.length > 0
						? formattedValues.join('\n\n')
						: `No expression examples found for: ${nodeTypes.join(', ')}`;

				reporter.complete({ summary });
				return createSuccessResponse(
					config,
					summary,
					Object.keys(stateUpdates).length > 0 ? stateUpdates : undefined,
				);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Failed to fetch expression examples';
				reporter.error(error instanceof Error ? error : new Error(message));
				return createErrorResponse(config, new Error(message));
			}
		},
		{
			name: GET_EXPRESSION_EXAMPLES_TOOL.toolName,
			description:
				'Fetch real-world expression examples from community templates for the given node types. ' +
				'Call this BEFORE configuring nodes that need expressions referencing external service nodes ' +
				'(triggers, API nodes, third-party integrations). The examples show which output fields are ' +
				'commonly used and how to reference them. Not needed for n8n built-in nodes (IF, Set, Merge, ' +
				'Code, etc.) whose output structure is well-documented.',
			schema: getExpressionExamplesSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_EXPRESSION_EXAMPLES_TOOL,
	};
}
