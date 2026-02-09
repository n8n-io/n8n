import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '../errors';
import type { SimpleWorkflow } from '../types/workflow';
import { isTriggerNodeType } from '../utils/node-helpers';
import type { BuilderTool, BuilderToolBase } from '../utils/stream-processor';
import { truncateJson } from '../utils/truncate-json';
import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getEffectiveWorkflow } from './helpers/state';
import { mermaidStringify } from './utils/mermaid.utils';

const DISPLAY_TITLE = 'Getting workflow overview';

/**
 * Schema for getting workflow overview
 */
const getWorkflowOverviewSchema = z.object({
	format: z
		.enum(['mermaid', 'summary'])
		.optional()
		.default('mermaid')
		.describe('Output format: mermaid (visual diagram) or summary (text list)'),
	includeParameters: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Include node parameters in the output (recommended to identify configuration issues)',
		),
});

/**
 * Output type for get workflow overview tool
 */
export interface GetWorkflowOverviewOutput {
	nodeCount: number;
	connectionCount: number;
	hasTrigger: boolean;
	format: 'mermaid' | 'summary';
	message: string;
}

/**
 * Finds the trigger node in a workflow
 */
function findTriggerNode(
	nodes: Array<{ id: string; name: string; type: string }>,
): { id: string; name: string; type: string } | undefined {
	return nodes.find((n) => isTriggerNodeType(n.type));
}

/**
 * Counts connections in the workflow
 */
function countConnections(connections: Record<string, unknown>): number {
	let count = 0;
	for (const sourceConns of Object.values(connections)) {
		if (typeof sourceConns === 'object' && sourceConns !== null) {
			for (const typeConns of Object.values(sourceConns)) {
				if (Array.isArray(typeConns)) {
					for (const connArray of typeConns) {
						if (Array.isArray(connArray)) {
							count += connArray.length;
						}
					}
				}
			}
		}
	}
	return count;
}

/**
 * Builds a summary format output with node IDs
 */
function buildSummaryFormat(
	nodes: Array<{ id: string; name: string; type: string; parameters?: Record<string, unknown> }>,
	triggerNode: { id: string; name: string; type: string } | undefined,
	includeParameters: boolean,
): string {
	const parts: string[] = ['<workflow_summary>'];

	// Metadata
	parts.push(`Node count: ${nodes.length}`);
	if (triggerNode) {
		parts.push(`Trigger: ${triggerNode.name} [id: ${triggerNode.id}] (${triggerNode.type})`);
	} else {
		parts.push('Trigger: None');
	}

	// Node list with IDs
	parts.push('');
	parts.push('Nodes:');
	for (const node of nodes) {
		const nodeHeader = `- ${node.name} [id: ${node.id}] (${node.type})`;
		if (includeParameters && node.parameters && Object.keys(node.parameters).length > 0) {
			parts.push(nodeHeader);
			parts.push(`  Parameters: ${truncateJson(node.parameters, { indent: 0 })}`);
		} else {
			parts.push(nodeHeader);
		}
	}

	parts.push('</workflow_summary>');
	return parts.join('\n');
}

/**
 * Builds a Mermaid diagram output with node IDs embedded in comments
 */
function buildMermaidFormat(
	workflow: SimpleWorkflow,
	triggerNode: { id: string; name: string; type: string } | undefined,
	includeParameters: boolean,
): string {
	const parts: string[] = ['<workflow_overview>'];

	// Metadata
	parts.push(`Node count: ${workflow.nodes.length}`);
	if (triggerNode) {
		parts.push(`Trigger: ${triggerNode.name} (${triggerNode.type})`);
	} else {
		parts.push('Trigger: None');
	}

	// Mermaid diagram - node IDs are embedded in the comment lines
	parts.push('');
	const mermaid = mermaidStringify(
		{ workflow },
		{
			includeNodeType: true,
			includeNodeParameters: includeParameters,
			includeNodeName: true,
		},
	);
	parts.push(mermaid);

	parts.push('</workflow_overview>');
	return parts.join('\n');
}

export const GET_WORKFLOW_OVERVIEW_TOOL: BuilderToolBase = {
	toolName: 'get_workflow_overview',
	displayTitle: DISPLAY_TITLE,
};

/**
 * Factory function to create the get workflow overview tool
 */
export function createGetWorkflowOverviewTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				GET_WORKFLOW_OVERVIEW_TOOL.toolName,
				DISPLAY_TITLE,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = getWorkflowOverviewSchema.parse(input);
				const { format, includeParameters } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get effective workflow (includes pending operations from this turn)
				const workflow = getEffectiveWorkflow();

				if (!workflow || workflow.nodes.length === 0) {
					const output: GetWorkflowOverviewOutput = {
						nodeCount: 0,
						connectionCount: 0,
						hasTrigger: false,
						format,
						message: 'Empty workflow',
					};
					reporter.complete(output);
					return createSuccessResponse(config, 'Empty workflow - no nodes to display');
				}

				const triggerNode = findTriggerNode(workflow.nodes);
				const connectionCount = countConnections(workflow.connections);

				logger?.debug(
					`Getting workflow overview: ${workflow.nodes.length} nodes, ${connectionCount} connections, format: ${format}`,
				);

				// Build output based on format
				let formattedOutput: string;
				if (format === 'summary') {
					formattedOutput = buildSummaryFormat(workflow.nodes, triggerNode, includeParameters);
				} else {
					formattedOutput = buildMermaidFormat(workflow, triggerNode, includeParameters);
				}

				const output: GetWorkflowOverviewOutput = {
					nodeCount: workflow.nodes.length,
					connectionCount,
					hasTrigger: !!triggerNode,
					format,
					message: `Workflow has ${workflow.nodes.length} nodes with ${connectionCount} connections`,
				};
				reporter.complete(output);

				return createSuccessResponse(config, formattedOutput);
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
						toolName: GET_WORKFLOW_OVERVIEW_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_WORKFLOW_OVERVIEW_TOOL.toolName,
			description:
				'Get a high-level overview of the current workflow including a Mermaid flowchart diagram showing node connections and flow. Use this to understand the overall workflow structure before making changes.',
			schema: getWorkflowOverviewSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_WORKFLOW_OVERVIEW_TOOL,
	};
}
