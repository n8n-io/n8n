import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { IConnections, NodeConnectionType } from 'n8n-workflow';
import { isNodeConnectionType, mapConnectionsByDestination } from 'n8n-workflow';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '../errors';
import type { SimpleWorkflow } from '../types/workflow';
import { isTriggerNodeType } from '../utils/node-helpers';
import type { BuilderTool, BuilderToolBase } from '../utils/stream-processor';
import { truncateJson } from '../utils/truncate-json';
import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getEffectiveWorkflow, getWorkflowState } from './helpers/state';

const DISPLAY_TITLE = 'Getting node context';

/**
 * Type guard to check if a value is a Record<string, unknown>
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Safely gets node run data from execution data
 */
function getNodeRunData(
	executionData: Record<string, unknown> | undefined,
	nodeName: string,
): unknown {
	if (!executionData || !isRecord(executionData.runData)) {
		return undefined;
	}
	return executionData.runData[nodeName];
}

/**
 * Schema for getting node context
 */
const getNodeContextSchema = z.object({
	nodeName: z.string().describe('The name of the node to get context for'),
	includeExecutionData: z
		.boolean()
		.optional()
		.default(true)
		.describe('Include execution data for this node if available'),
});

/**
 * Output type for get node context tool
 */
export interface GetNodeContextOutput {
	found: boolean;
	nodeName: string;
	nodeType?: string;
	parentCount: number;
	childCount: number;
	hasExecutionData: boolean;
	message: string;
}

/**
 * Node classification types
 */
type NodeClassification = 'trigger' | 'regular' | 'ai_parent' | 'ai_subnode';

/**
 * Classifies a node based on its type and connections
 */
function classifyNode(
	nodeType: string,
	hasAiInputs: boolean,
	hasAiOutputs: boolean,
): NodeClassification {
	// Check if it's a trigger node
	if (isTriggerNodeType(nodeType)) {
		return 'trigger';
	}

	// Check if it's an AI parent (receives AI connections)
	if (hasAiInputs) {
		return 'ai_parent';
	}

	// Check if it's an AI subnode (sends AI connections)
	if (hasAiOutputs) {
		return 'ai_subnode';
	}

	return 'regular';
}

/**
 * Gets direct parents of a node using inverted connections
 */
function getParentConnections(
	nodeName: string,
	connectionsByDestination: IConnections,
): Array<{ node: string; type: NodeConnectionType }> {
	const nodeConns = connectionsByDestination[nodeName];
	if (!nodeConns) return [];

	const parents: Array<{ node: string; type: NodeConnectionType }> = [];

	for (const [type, typeConns] of Object.entries(nodeConns)) {
		if (!isNodeConnectionType(type) || !typeConns) continue;

		for (const connArray of typeConns) {
			if (!connArray) continue;
			for (const conn of connArray) {
				parents.push({ node: conn.node, type });
			}
		}
	}

	return parents;
}

/**
 * Gets direct children of a node from connections
 */
function getChildConnections(
	nodeName: string,
	connections: IConnections,
): Array<{ node: string; type: NodeConnectionType }> {
	const nodeConns = connections[nodeName];
	if (!nodeConns) return [];

	const children: Array<{ node: string; type: NodeConnectionType }> = [];

	for (const [type, typeConns] of Object.entries(nodeConns)) {
		if (!isNodeConnectionType(type) || !typeConns) continue;

		for (const connArray of typeConns) {
			if (!connArray) continue;
			for (const conn of connArray) {
				children.push({ node: conn.node, type });
			}
		}
	}

	return children;
}

/**
 * Builds the formatted node context output
 */
function buildNodeContext(
	node: SimpleWorkflow['nodes'][number],
	workflow: SimpleWorkflow,
	includeExecutionData: boolean,
	executionSchema: Array<{ nodeName: string; schema: unknown }>,
	executionData: Record<string, unknown> | undefined,
): string {
	const parts: string[] = [`<node_context name="${node.name}" id="${node.id}">`];

	// Basic node info
	parts.push(`ID: ${node.id}`);
	parts.push(`Type: ${node.type}`);
	if (node.typeVersion) {
		parts.push(`Version: ${node.typeVersion}`);
	}

	// Get connection info
	const connectionsByDestination = mapConnectionsByDestination(workflow.connections);
	const parents = getParentConnections(node.name, connectionsByDestination);
	const children = getChildConnections(node.name, workflow.connections);

	// Check for AI connections
	const hasAiInputs = parents.some((p) => p.type !== 'main');
	const hasAiOutputs = children.some((c) => c.type !== 'main');

	// Classification
	const classification = classifyNode(node.type, hasAiInputs, hasAiOutputs);
	parts.push(`Classification: ${classification}`);

	// Parent nodes
	parts.push('');
	if (parents.length > 0) {
		parts.push('Parent nodes (upstream):');
		for (const parent of parents) {
			if (parent.type === 'main') {
				parts.push(`  ← ${parent.node}`);
			} else {
				parts.push(`  ←[${parent.type}] ${parent.node}`);
			}
		}
	} else {
		parts.push('Parent nodes: None (this is a start node)');
	}

	// Child nodes
	parts.push('');
	if (children.length > 0) {
		parts.push('Child nodes (downstream):');
		for (const child of children) {
			if (child.type === 'main') {
				parts.push(`  → ${child.node}`);
			} else {
				parts.push(`  -[${child.type}]-> ${child.node}`);
			}
		}
	} else {
		parts.push('Child nodes: None (this is an end node)');
	}

	// Parameters
	parts.push('');
	parts.push('Parameters:');
	if (node.parameters && Object.keys(node.parameters).length > 0) {
		parts.push(truncateJson(node.parameters));
	} else {
		parts.push('  (no parameters set)');
	}

	// Execution data
	if (includeExecutionData) {
		parts.push('');

		// Schema from executionSchema
		const nodeSchema = executionSchema.find((s) => s.nodeName === node.name);
		if (nodeSchema) {
			parts.push('Output schema (from last execution):');
			parts.push(truncateJson(nodeSchema.schema));
		}

		// RunData from executionData
		const nodeRunData = getNodeRunData(executionData, node.name);
		if (nodeRunData) {
			parts.push('');
			parts.push('Execution data (from last run):');
			parts.push(truncateJson(nodeRunData));
		}

		if (!nodeSchema && !nodeRunData) {
			parts.push('No execution data available for this node');
		}
	}

	parts.push('</node_context>');
	return parts.join('\n');
}

export const GET_NODE_CONTEXT_TOOL: BuilderToolBase = {
	toolName: 'get_node_context',
	displayTitle: DISPLAY_TITLE,
};

/**
 * Factory function to create the get node context tool
 */
export function createGetNodeContextTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				GET_NODE_CONTEXT_TOOL.toolName,
				DISPLAY_TITLE,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = getNodeContextSchema.parse(input);
				const { nodeName, includeExecutionData } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get effective workflow (includes pending operations from this turn)
				const workflow = getEffectiveWorkflow();
				// Get state for execution context (not affected by pending operations)
				const state = getWorkflowState();

				// Find the node
				const node = workflow.nodes.find((n) => n.name === nodeName);
				if (!node) {
					const output: GetNodeContextOutput = {
						found: false,
						nodeName,
						parentCount: 0,
						childCount: 0,
						hasExecutionData: false,
						message: `Node "${nodeName}" not found in workflow`,
					};
					reporter.complete(output);
					return createSuccessResponse(
						config,
						`Node "${nodeName}" not found. Available nodes: ${workflow.nodes.map((n) => n.name).join(', ')}`,
					);
				}

				// Get execution context
				const executionSchema = state.workflowContext?.executionSchema ?? [];
				const executionData = state.workflowContext?.executionData;

				logger?.debug(`Getting context for node "${nodeName}" (${node.type})`);

				// Build the context
				const formattedContext = buildNodeContext(
					node,
					workflow,
					includeExecutionData,
					executionSchema,
					executionData,
				);

				// Calculate connection counts
				const connectionsByDestination = mapConnectionsByDestination(workflow.connections);
				const parents = getParentConnections(nodeName, connectionsByDestination);
				const children = getChildConnections(nodeName, workflow.connections);

				const nodeSchema = executionSchema.find((s) => s.nodeName === nodeName);
				const nodeRunData = getNodeRunData(executionData, nodeName);

				const output: GetNodeContextOutput = {
					found: true,
					nodeName,
					nodeType: node.type,
					parentCount: parents.length,
					childCount: children.length,
					hasExecutionData: nodeSchema !== undefined || nodeRunData !== undefined,
					message: `Found node "${nodeName}" with ${parents.length} parents and ${children.length} children`,
				};
				reporter.complete(output);

				return createSuccessResponse(config, formattedContext);
			} catch (error) {
				// Handle validation or unexpected errors
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const errorMessage =
					error instanceof Error
						? `${error.message}${error.stack ? `\n${error.stack}` : ''}`
						: 'Unknown error occurred';
				const toolError = new ToolExecutionError(errorMessage, {
					toolName: GET_NODE_CONTEXT_TOOL.toolName,
					cause: error instanceof Error ? error : undefined,
				});
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_NODE_CONTEXT_TOOL.toolName,
			description:
				'Get full context for a specific node including its parameters, parent nodes (upstream), child nodes (downstream), classification, and execution data. Use this before configuring a node to understand its current state and connections.',
			schema: getNodeContextSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_NODE_CONTEXT_TOOL,
	};
}
