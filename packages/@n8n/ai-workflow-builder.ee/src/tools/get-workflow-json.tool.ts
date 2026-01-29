import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { IConnections, NodeConnectionType } from 'n8n-workflow';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '../errors';
import type { SimpleWorkflow } from '../types/workflow';
import type { BuilderTool, BuilderToolBase } from '../utils/stream-processor';
import { trimWorkflowJSON } from '../utils/trim-workflow-context';
import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getEffectiveWorkflow } from './helpers/state';

const DISPLAY_TITLE = 'Getting workflow JSON';

/**
 * Schema for getting workflow JSON
 */
const getWorkflowJsonSchema = z.object({
	nodeNames: z
		.array(z.string())
		.optional()
		.describe('Optional: Filter to only include specific nodes by name'),
	includeConnections: z
		.boolean()
		.optional()
		.default(true)
		.describe('Include connections between nodes'),
});

/**
 * Output type for get workflow JSON tool
 */
export interface GetWorkflowJsonOutput {
	nodeCount: number;
	filtered: boolean;
	message: string;
}

/**
 * Filters connections to only include those between the specified nodes
 */
function filterConnections(connections: IConnections, nodeNames: Set<string>): IConnections {
	const filtered: IConnections = {};

	for (const [sourceName, sourceConns] of Object.entries(connections)) {
		if (!nodeNames.has(sourceName)) continue;

		const filteredSourceConns: IConnections[string] = {};

		for (const [type, typeConns] of Object.entries(sourceConns) as Array<
			[NodeConnectionType, IConnections[string][NodeConnectionType]]
		>) {
			if (!typeConns) continue;

			const filteredTypeConns: NonNullable<IConnections[string][NodeConnectionType]> = [];

			for (const connArray of typeConns) {
				if (!connArray) {
					filteredTypeConns.push(null);
					continue;
				}

				const filteredConnArray = connArray.filter((conn) => nodeNames.has(conn.node));
				filteredTypeConns.push(filteredConnArray.length > 0 ? filteredConnArray : null);
			}

			// Only include if there are actual connections
			if (filteredTypeConns.some((arr) => arr !== null)) {
				filteredSourceConns[type] = filteredTypeConns;
			}
		}

		if (Object.keys(filteredSourceConns).length > 0) {
			filtered[sourceName] = filteredSourceConns;
		}
	}

	return filtered;
}

/**
 * Builds the filtered workflow JSON
 */
function buildFilteredWorkflow(
	workflow: SimpleWorkflow,
	nodeNames?: string[],
	includeConnections?: boolean,
): SimpleWorkflow {
	// If no filter, return trimmed workflow
	if (!nodeNames || nodeNames.length === 0) {
		const trimmed = trimWorkflowJSON(workflow);
		if (!includeConnections) {
			return { ...trimmed, connections: {} };
		}
		return trimmed;
	}

	// Filter nodes
	const nodeNamesSet = new Set(nodeNames);
	const filteredNodes = workflow.nodes.filter((n) => nodeNamesSet.has(n.name));

	// Filter connections if requested
	let filteredConnections: IConnections = {};
	if (includeConnections) {
		filteredConnections = filterConnections(workflow.connections, nodeNamesSet);
	}

	// Create filtered workflow and trim it
	const filteredWorkflow: SimpleWorkflow = {
		...workflow,
		nodes: filteredNodes,
		connections: filteredConnections,
	};

	return trimWorkflowJSON(filteredWorkflow);
}

export const GET_WORKFLOW_JSON_TOOL: BuilderToolBase = {
	toolName: 'get_workflow_json',
	displayTitle: DISPLAY_TITLE,
};

/**
 * Factory function to create the get workflow JSON tool
 */
export function createGetWorkflowJsonTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				GET_WORKFLOW_JSON_TOOL.toolName,
				DISPLAY_TITLE,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = getWorkflowJsonSchema.parse(input);
				const { nodeNames, includeConnections } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get effective workflow (includes pending operations from this turn)
				const workflow = getEffectiveWorkflow();

				if (!workflow || workflow.nodes.length === 0) {
					const output: GetWorkflowJsonOutput = {
						nodeCount: 0,
						filtered: false,
						message: 'Empty workflow',
					};
					reporter.complete(output);
					return createSuccessResponse(config, '{"nodes": [], "connections": {}}');
				}

				const isFiltered = nodeNames !== undefined && nodeNames.length > 0;

				logger?.debug(
					`Getting workflow JSON: ${workflow.nodes.length} nodes${isFiltered ? `, filtering to ${nodeNames.length} nodes` : ''}`,
				);

				// Build filtered workflow
				const filteredWorkflow = buildFilteredWorkflow(
					workflow,
					nodeNames,
					includeConnections ?? true,
				);

				// Format output
				const parts: string[] = ['<workflow_json>'];
				parts.push(JSON.stringify(filteredWorkflow, null, 2));
				parts.push('</workflow_json>');

				if (isFiltered) {
					const foundNodes = filteredWorkflow.nodes.map((n) => n.name);
					const notFoundNodes = nodeNames.filter((name) => !foundNodes.includes(name));
					if (notFoundNodes.length > 0) {
						parts.push(`<note>Nodes not found: ${notFoundNodes.join(', ')}</note>`);
					}
				}

				parts.push(
					'<note>Large parameter values may be trimmed. Use get_node_parameter tool for full values.</note>',
				);

				const output: GetWorkflowJsonOutput = {
					nodeCount: filteredWorkflow.nodes.length,
					filtered: isFiltered,
					message: isFiltered
						? `Retrieved ${filteredWorkflow.nodes.length} of ${nodeNames.length} requested nodes`
						: `Retrieved full workflow with ${filteredWorkflow.nodes.length} nodes`,
				};
				reporter.complete(output);

				return createSuccessResponse(config, parts.join('\n'));
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
						toolName: GET_WORKFLOW_JSON_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_WORKFLOW_JSON_TOOL.toolName,
			description:
				'Get the raw workflow JSON, optionally filtered to specific nodes. Use this when you need the actual JSON structure for nodes rather than a visual representation. Large parameter values are automatically trimmed.',
			schema: getWorkflowJsonSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_WORKFLOW_JSON_TOOL,
	};
}
