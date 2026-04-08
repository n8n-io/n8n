import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import type { WorkflowMetadata } from '@/types';
import type { BuilderToolBase } from '@/utils/stream-processor';

import { ValidationError, ToolExecutionError } from '../errors';
import {
	createProgressReporter,
	createSuccessResponse,
	createErrorResponse,
	getWorkflowState,
	reportProgress,
} from './helpers';
import { mermaidStringify } from './utils/mermaid.utils';
import {
	formatNodeConfigurationExamples,
	getNodeConfigurationsFromTemplates,
} from './utils/node-configuration.utils';
import type { NodeConfigurationEntry } from '../types/tools';
import { fetchWorkflowsFromTemplates } from './web/templates';

/**
 * Schema for a single node request
 */
const nodeRequestSchema = z.object({
	nodeType: z.string().describe('The exact node type name (e.g., n8n-nodes-base.httpRequest)'),
	nodeVersion: z
		.number()
		.optional()
		.describe('Optional specific node version to filter examples by'),
});

/**
 * Schema for get node examples tool input - accepts a list of nodes
 */
const getNodeExamplesSchema = z.object({
	nodes: z
		.array(nodeRequestSchema)
		.min(1)
		.max(10)
		.describe('List of nodes to get examples for (1-10 nodes)'),
});

/** Example type determines what format the tool returns */
export type NodeExampleType = 'configuration' | 'connections';

/** Tool configuration by example type */
const TOOL_CONFIG: Record<NodeExampleType, { meta: BuilderToolBase; description: string }> = {
	configuration: {
		meta: {
			toolName: 'get_node_configuration_examples',
			displayTitle: 'Getting node configuration examples',
		},
		description: `Get real-world parameter configuration examples for multiple node types from community templates.

Use this tool when you need reference examples for configuring node parameters:
- When you need to understand proper parameter structure
- To see how templated workflows configure specific integrations

Parameters:
- nodes: Array of objects with nodeType (required) and nodeVersion (optional)
  Example: [{ nodeType: "n8n-nodes-base.httpRequest" }, { nodeType: "n8n-nodes-base.gmail", nodeVersion: 2 }]

Returns markdown-formatted examples showing proven parameter configurations for each node.`,
	},
	connections: {
		meta: {
			toolName: 'get_node_connection_examples',
			displayTitle: 'Getting node connection examples',
		},
		description: `Get mermaid diagrams showing how specific node types are typically connected in real workflows.

Use this tool when you need to understand node connection patterns:
- When connecting nodes with non-standard output patterns (e.g., splitInBatches, Switch, IF)
- To see how nodes are typically placed in workflow flows
- To understand which nodes typically come before/after specific nodes

Parameters:
- nodes: Array of objects with nodeType (required) and nodeVersion (optional)
  Example: [{ nodeType: "n8n-nodes-base.splitInBatches" }, { nodeType: "n8n-nodes-base.if" }]

Returns mermaid diagrams from community workflows containing each node.`,
	},
};

/** Result from workflow retrieval */
interface WorkflowRetrievalResult {
	workflows: WorkflowMetadata[];
	nodeConfigs: NodeConfigurationEntry[];
	newTemplates: WorkflowMetadata[];
}

/**
 * Single retrieval function for getting workflows containing a specific node type.
 * Checks state cache first, then fetches from API if needed.
 */
async function getWorkflowsForNodeType(
	nodeType: string,
	logger?: Logger,
): Promise<WorkflowRetrievalResult> {
	// Check state cache (templates from previous tool calls)
	let stateCachedTemplates: WorkflowMetadata[] = [];
	try {
		const state = getWorkflowState();
		stateCachedTemplates = state?.cachedTemplates ?? [];
	} catch {
		// State may not be available in some contexts
	}

	const relevantFromState = stateCachedTemplates.filter((wf) =>
		wf.workflow.nodes.some((n) => n.type === nodeType),
	);

	if (relevantFromState.length > 0) {
		const nodeConfigs = getNodeConfigurationsFromTemplates(relevantFromState, nodeType);

		logger?.debug('Found node configurations in state cache', {
			nodeType,
			configCount: nodeConfigs.length,
			workflowCount: relevantFromState.length,
		});

		return {
			workflows: relevantFromState,
			nodeConfigs,
			newTemplates: [],
		};
	}

	// No cached data, fetch from templates API
	try {
		const result = await fetchWorkflowsFromTemplates(
			{ nodes: nodeType, rows: 5 },
			{ maxTemplates: 5, logger },
		);

		if (result.workflows.length > 0) {
			const nodeConfigs = getNodeConfigurationsFromTemplates(result.workflows, nodeType);

			logger?.debug('Fetched workflows from templates API', {
				nodeType,
				configCount: nodeConfigs.length,
				workflowCount: result.workflows.length,
			});

			return {
				workflows: result.workflows,
				nodeConfigs,
				newTemplates: result.workflows,
			};
		}
	} catch (error) {
		logger?.warn('Failed to fetch node examples from templates', { nodeType, error });
	}

	return {
		workflows: [],
		nodeConfigs: [],
		newTemplates: [],
	};
}

/** Maximum number of examples to return to avoid context overload */
const MAX_EXAMPLES = 1;

/**
 * Generate mermaid connection examples for a specific node type
 */
function formatConnectionExamples(nodeType: string, workflows: WorkflowMetadata[]): string {
	const shortNodeType = nodeType.split('.').pop() ?? nodeType;

	if (workflows.length === 0) {
		return `## Node Connection Examples: ${nodeType}\n\nNo connection examples found.`;
	}

	const lines = [
		`## Node Connection Examples: ${nodeType}`,
		'',
		`These mermaid diagrams show workflows containing **${shortNodeType}**.`,
		'',
		'Look for the target node in each diagram to understand:',
		'- Which nodes typically come BEFORE this node (incoming connections)',
		'- Which nodes typically come AFTER this node (outgoing connections)',
		'- For multi-output nodes like splitInBatches: output 0 = "done" branch, output 1 = "loop" branch',
		'',
	];

	for (const workflow of workflows.slice(0, MAX_EXAMPLES)) {
		const mermaid = mermaidStringify(workflow, { includeNodeParameters: false });
		lines.push(`### Example: ${workflow.name}`, '', '```mermaid', mermaid, '```', '');
	}

	return lines.join('\n');
}

/**
 * Handle tool errors consistently
 */
function handleToolError(
	error: unknown,
	reporter: ReturnType<typeof createProgressReporter>,
	toolName: string,
	config: Parameters<typeof createErrorResponse>[0],
) {
	if (error instanceof z.ZodError) {
		const validationError = new ValidationError('Invalid input parameters', {
			extra: { errors: error.errors },
		});
		reporter.error(validationError);
		return createErrorResponse(config, validationError);
	}

	const toolError = new ToolExecutionError(
		error instanceof Error ? error.message : 'Unknown error occurred',
		{ toolName, cause: error instanceof Error ? error : undefined },
	);
	reporter.error(toolError);
	return createErrorResponse(config, toolError);
}

/** Options for creating the node examples tool */
interface CreateNodeExamplesToolOptions {
	exampleType: NodeExampleType;
	logger?: Logger;
}

/**
 * Factory function to create a node examples tool.
 * Use exampleType to determine whether it returns configuration or connection examples.
 */
export function createGetNodeExamplesTool({ exampleType, logger }: CreateNodeExamplesToolOptions) {
	const { meta: toolMeta, description } = TOOL_CONFIG[exampleType];

	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(config, toolMeta.toolName, toolMeta.displayTitle);

			try {
				const validatedInput = getNodeExamplesSchema.parse(input);
				const { nodes } = validatedInput;

				reporter.start(validatedInput);

				// Fetch all node examples in parallel
				reportProgress(reporter, `Fetching examples for ${nodes.length} node(s)...`);

				const results = await Promise.all(
					nodes.map(async ({ nodeType }) => await getWorkflowsForNodeType(nodeType, logger)),
				);

				// Process results and format messages
				const allNewTemplates: WorkflowMetadata[] = [];
				let totalFound = 0;

				const allMessages = nodes.map(({ nodeType, nodeVersion }, i) => {
					const result = results[i];

					allNewTemplates.push(...result.newTemplates);
					totalFound +=
						exampleType === 'configuration' ? result.nodeConfigs.length : result.workflows.length;

					return exampleType === 'configuration'
						? formatNodeConfigurationExamples(nodeType, result.nodeConfigs, nodeVersion)
						: formatConnectionExamples(nodeType, result.workflows);
				});

				const combinedMessage = allMessages.join('\n\n---\n\n');
				const nodeTypes = nodes.map((n) => n.nodeType);

				reporter.complete({ nodeTypes, totalFound, message: combinedMessage });

				// Build state updates - only add new templates if fetched from API
				const stateUpdates: Record<string, unknown> = {};
				if (allNewTemplates.length > 0) {
					stateUpdates.cachedTemplates = allNewTemplates;
				}

				return createSuccessResponse(
					config,
					combinedMessage,
					Object.keys(stateUpdates).length > 0 ? stateUpdates : undefined,
				);
			} catch (error) {
				return handleToolError(error, reporter, toolMeta.toolName, config);
			}
		},
		{
			name: toolMeta.toolName,
			description,
			schema: getNodeExamplesSchema,
		},
	);

	return { tool: dynamicTool, ...toolMeta };
}

// Convenience factory functions for backward compatibility
export const createGetNodeConfigurationExamplesTool = (logger?: Logger) =>
	createGetNodeExamplesTool({ exampleType: 'configuration', logger });

export const createGetNodeConnectionExamplesTool = (logger?: Logger) =>
	createGetNodeExamplesTool({ exampleType: 'connections', logger });
