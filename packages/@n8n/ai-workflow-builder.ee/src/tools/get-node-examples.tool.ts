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
import { mermaidStringify } from './utils/markdown-workflow.utils';
import {
	formatNodeConfigurationExamples,
	getNodeConfigurationsFromTemplates,
} from './utils/node-configuration.utils';
import type { NodeConfigurationEntry } from '../types/tools';
import { fetchWorkflowsFromTemplates } from './web/templates';

/**
 * Schema for get node examples tool input
 */
const getNodeExamplesSchema = z.object({
	nodeType: z.string().describe('The exact node type name (e.g., n8n-nodes-base.httpRequest)'),
	nodeVersion: z
		.number()
		.optional()
		.describe('Optional specific node version to filter examples by'),
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
		description: `Get real-world parameter configuration examples for a specific node type from community templates.

Use this tool when you need reference examples for configuring node parameters:
- Before configuring nodes with complex parameters
- When you need to understand proper parameter structure
- To see how community workflows configure specific integrations

Parameters:
- nodeType: The exact node type (e.g., "n8n-nodes-base.httpRequest")
- nodeVersion: Optional version number to filter examples

Returns markdown-formatted examples showing proven parameter configurations.`,
	},
	connections: {
		meta: {
			toolName: 'get_node_connection_examples',
			displayTitle: 'Getting node connection examples',
		},
		description: `Get mermaid diagrams showing how a specific node type is typically connected in real workflows.

Use this tool when you need to understand node connection patterns:
- When connecting nodes with non-standard output patterns (e.g., splitInBatches, Switch, IF)
- To see how the node is typically placed in workflow flows
- To understand which nodes typically come before/after this node

Parameters:
- nodeType: The exact node type (e.g., "n8n-nodes-base.splitInBatches")
- nodeVersion: Optional version number to filter examples

Returns mermaid diagrams from community workflows containing this node.`,
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
 * Checks cached templates first, then fetches from API if needed.
 */
async function getWorkflowsForNodeType(
	nodeType: string,
	logger?: Logger,
	onProgress?: (message: string) => void,
): Promise<WorkflowRetrievalResult> {
	// Get cached templates from state
	let cachedTemplates: WorkflowMetadata[] = [];

	try {
		const state = getWorkflowState();
		cachedTemplates = state?.cachedTemplates ?? [];
	} catch {
		// State may not be available in some contexts
	}

	// Check if cached templates contain this node type
	const relevantWorkflows = cachedTemplates.filter((wf) =>
		wf.workflow.nodes.some((n) => n.type === nodeType),
	);

	if (relevantWorkflows.length > 0) {
		const nodeConfigs = getNodeConfigurationsFromTemplates(relevantWorkflows, nodeType);

		logger?.debug('Found node configurations in cached templates', {
			nodeType,
			configCount: nodeConfigs.length,
			workflowCount: relevantWorkflows.length,
		});

		return {
			workflows: relevantWorkflows,
			nodeConfigs,
			newTemplates: [],
		};
	}

	// No cached data, fetch from templates API
	onProgress?.(`Fetching examples for ${nodeType}...`);

	try {
		const result = await fetchWorkflowsFromTemplates(
			{ nodes: nodeType, rows: 10 },
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
				const { nodeType, nodeVersion } = validatedInput;

				reporter.start(validatedInput);

				const result = await getWorkflowsForNodeType(nodeType, logger, (msg) =>
					reportProgress(reporter, msg),
				);

				// Format based on example type
				const message =
					exampleType === 'configuration'
						? formatNodeConfigurationExamples(nodeType, result.nodeConfigs, nodeVersion)
						: formatConnectionExamples(nodeType, result.workflows);

				const totalFound =
					exampleType === 'configuration' ? result.nodeConfigs.length : result.workflows.length;

				reporter.complete({ nodeType, totalFound, message });

				// Build state updates - only add new templates if fetched from API
				const stateUpdates: Record<string, unknown> = {};
				if (result.newTemplates.length > 0) {
					stateUpdates.cachedTemplates = result.newTemplates;
				}

				return createSuccessResponse(
					config,
					message,
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
