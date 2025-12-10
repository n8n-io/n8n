import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import type { NodeConfigurationsMap, WorkflowMetadata } from '@/types';
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
	collectNodeConfigurationsFromWorkflows,
	formatNodeConfigurationExamples,
} from './utils/node-configuration.utils';
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

Returns XML-formatted examples showing proven parameter configurations.`,
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

/** Entry type for node configurations */
type NodeConfigurationEntry = NodeConfigurationsMap[string][number];

/** Result from workflow retrieval */
interface WorkflowRetrievalResult {
	workflows: WorkflowMetadata[];
	configurations: NodeConfigurationsMap;
	nodeConfigs: NodeConfigurationEntry[];
	newWorkflows: WorkflowMetadata[];
}

/**
 * Single retrieval function for getting workflows containing a specific node type.
 * Checks cache first, then fetches from API if needed.
 */
async function getWorkflowsForNodeType(
	nodeType: string,
	logger?: Logger,
	onProgress?: (message: string) => void,
): Promise<WorkflowRetrievalResult> {
	// Get cached state
	let cachedWorkflows: WorkflowMetadata[] = [];
	let configurations: NodeConfigurationsMap = {};

	try {
		const state = getWorkflowState();
		cachedWorkflows = state?.cachedWorkflows ?? [];
		configurations = state?.nodeConfigurations ?? {};
	} catch {
		// State may not be available in some contexts
	}

	// Check if we already have configs for this node type
	const existingConfigs = configurations[nodeType] ?? [];
	if (existingConfigs.length > 0) {
		const relevantWorkflows = cachedWorkflows.filter((wf) =>
			wf.workflow.nodes.some((n) => n.type === nodeType),
		);

		logger?.debug('Found existing node configurations in state', {
			nodeType,
			configCount: existingConfigs.length,
			workflowCount: relevantWorkflows.length,
		});

		return {
			workflows: relevantWorkflows,
			configurations,
			nodeConfigs: existingConfigs,
			newWorkflows: [],
		};
	}

	// Check if cached workflows contain this node type
	const relevantWorkflows = cachedWorkflows.filter((wf) =>
		wf.workflow.nodes.some((n) => n.type === nodeType),
	);

	if (relevantWorkflows.length > 0) {
		const extractedConfigs = collectNodeConfigurationsFromWorkflows(relevantWorkflows);
		const nodeConfigs = extractedConfigs[nodeType] ?? [];

		logger?.debug('Extracted configurations from cached workflows', {
			nodeType,
			configCount: nodeConfigs.length,
			workflowCount: relevantWorkflows.length,
		});

		return {
			workflows: relevantWorkflows,
			configurations: extractedConfigs,
			nodeConfigs,
			newWorkflows: [],
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
			const fetchedConfigs = collectNodeConfigurationsFromWorkflows(result.workflows);
			const nodeConfigs = fetchedConfigs[nodeType] ?? [];

			logger?.debug('Fetched workflows from templates API', {
				nodeType,
				configCount: nodeConfigs.length,
				workflowCount: result.workflows.length,
			});

			return {
				workflows: result.workflows,
				configurations: fetchedConfigs,
				nodeConfigs,
				newWorkflows: result.workflows,
			};
		}
	} catch (error) {
		logger?.warn('Failed to fetch node examples from templates', { nodeType, error });
	}

	return {
		workflows: [],
		configurations: {},
		nodeConfigs: [],
		newWorkflows: [],
	};
}

/**
 * Generate mermaid connection examples for a specific node type
 */
function formatConnectionExamples(nodeType: string, workflows: WorkflowMetadata[]): string {
	const examples: string[] = [];
	const shortNodeType = nodeType.split('.').pop() ?? nodeType;

	for (const workflow of workflows.slice(0, 5)) {
		const mermaid = mermaidStringify(workflow, { includeNodeParameters: false });
		examples.push(`<example workflow="${workflow.name}">\n${mermaid}\n</example>`);
	}

	if (examples.length === 0) {
		return `<node_connection_examples node_type="${nodeType}">No connection examples found</node_connection_examples>`;
	}

	return [
		`<node_connection_examples node_type="${nodeType}" short_name="${shortNodeType}">`,
		`These mermaid diagrams show workflows containing ${shortNodeType}.`,
		'Look for the target node in each diagram to understand:',
		'- Which nodes typically come BEFORE this node (incoming connections)',
		'- Which nodes typically come AFTER this node (outgoing connections)',
		'- For multi-output nodes like splitInBatches: output 0 = "done" branch, output 1 = "loop" branch',
		'',
		...examples,
		'</node_connection_examples>',
	].join('\n');
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

				// Build state updates
				const stateUpdates: Record<string, unknown> = {};
				if (exampleType === 'configuration') {
					stateUpdates.nodeConfigurations = result.configurations;
				}
				if (result.newWorkflows.length > 0) {
					stateUpdates.cachedWorkflows = result.newWorkflows;
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
