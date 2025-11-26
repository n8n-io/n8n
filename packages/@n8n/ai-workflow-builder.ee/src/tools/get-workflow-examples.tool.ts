import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { IConnection, IConnections, INode, NodeInputConnections } from 'n8n-workflow';
import { z } from 'zod';

import type { GetWorkflowExamplesOutput, SimpleWorkflow, WorkflowMetadata } from '@/types';
import { categories } from '@/types/web/templates';
import type { BuilderToolBase } from '@/utils/stream-processor';

import { ValidationError, ToolExecutionError } from '../errors';
import {
	createProgressReporter,
	createBatchProgressReporter,
	createSuccessResponse,
	createErrorResponse,
} from './helpers';
import { mermaidStringify } from './utils/markdown-workflow.utils';
import { fetchTemplateList, fetchTemplateByID } from './web/templates';

/** Agent node type identifier */
const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';

/** AI connection types that connect sub-nodes to agents */
const AI_CONNECTION_TYPES = [
	'ai_tool',
	'ai_memory',
	'ai_languageModel',
	'ai_outputParser',
	'ai_retriever',
	'ai_embedding',
	'ai_vectorStore',
	'ai_document',
	'ai_textSplitter',
];

/**
 * Extract agent nodes and their connected sub-nodes from a workflow
 * Returns a filtered workflow containing only agent subgraphs
 */
function extractAgentSubgraph(workflow: SimpleWorkflow): SimpleWorkflow | null {
	const { nodes, connections } = workflow;

	// Find all agent nodes
	const agentNodes = nodes.filter((node) => node.type === AGENT_NODE_TYPE);
	if (agentNodes.length === 0) {
		return null;
	}

	const agentNodeNames = new Set(agentNodes.map((n) => n.name));

	// Find all sub-nodes connected to agents via AI connection types
	const subNodeNames = new Set<string>();

	for (const [sourceName, sourceConns] of Object.entries(connections)) {
		for (const connType of AI_CONNECTION_TYPES) {
			const connList = sourceConns[connType as keyof typeof sourceConns] as
				| Array<Array<{ node: string }>>
				| undefined;
			if (connList) {
				for (const connArray of connList) {
					if (connArray) {
						for (const conn of connArray) {
							// If target is an agent, source is a sub-node
							if (agentNodeNames.has(conn.node)) {
								subNodeNames.add(sourceName);
							}
						}
					}
				}
			}
		}
	}

	// Collect all relevant node names
	const relevantNodeNames = new Set([...agentNodeNames, ...subNodeNames]);

	// Filter nodes
	const filteredNodes: INode[] = nodes.filter((node) => relevantNodeNames.has(node.name));

	// Filter connections to only include those between relevant nodes
	const filteredConnections: IConnections = {};
	for (const [sourceName, sourceConns] of Object.entries(connections)) {
		if (!relevantNodeNames.has(sourceName)) continue;

		const filteredSourceConns: IConnections[string] = {};
		for (const [connType, connList] of Object.entries(sourceConns)) {
			const filteredConnList: NodeInputConnections = [];
			for (const connArray of connList) {
				if (connArray) {
					const filtered = connArray.filter((conn: IConnection) =>
						relevantNodeNames.has(conn.node),
					);
					if (filtered.length > 0) {
						filteredConnList.push(filtered);
					}
				}
			}
			if (filteredConnList.length > 0) {
				(filteredSourceConns as Record<string, NodeInputConnections>)[connType] = filteredConnList;
			}
		}
		if (Object.keys(filteredSourceConns).length > 0) {
			filteredConnections[sourceName] = filteredSourceConns;
		}
	}

	return {
		name: workflow.name,
		nodes: filteredNodes,
		connections: filteredConnections,
	};
}

/**
 * Options for creating the workflow examples tool
 */
export interface WorkflowExamplesToolOptions {
	/** When true, only extract agent nodes and their sub-nodes from workflows */
	agentsOnly?: boolean;
}

/**
 * Workflow example query schema
 */
const workflowExampleQuerySchema = z.object({
	search: z.string().optional().describe('Search term to find workflow examples'),
	category: z.enum(categories).optional().describe('Filter by workflow category'),
});

/**
 * Main schema for get workflow examples tool
 */
const getWorkflowExamplesSchema = z.object({
	queries: z
		.array(workflowExampleQuerySchema)
		.min(1)
		.describe('Array of search queries to find workflow examples'),
});

/**
 * Inferred types from schemas
 */
type WorkflowExampleQuery = z.infer<typeof workflowExampleQuerySchema>;

/**
 * Fetch workflow examples from the API
 */
async function fetchWorkflowExamples(
	query: WorkflowExampleQuery,
	logger?: Logger,
): Promise<{ workflows: WorkflowMetadata[]; totalFound: number }> {
	logger?.debug('Fetching workflow examples with query', { query });

	// First, fetch the list of workflow templates (metadata)
	const response = await fetchTemplateList({
		search: query.search,
		category: query.category,
	});

	// Then fetch complete workflow data for each template
	const workflowMetadata: Array<WorkflowMetadata | undefined> = await Promise.all(
		response.workflows.map(async (workflow) => {
			try {
				const fullWorkflow = await fetchTemplateByID(workflow.id);
				return {
					name: workflow.name,
					description: workflow.description,
					workflow: fullWorkflow.workflow,
				};
			} catch (error) {
				// failed to fetch a workflow, ignore it for now
				logger?.warn(`Failed to fetch full workflow for template ${workflow.id}`, { error });
				return undefined;
			}
		}),
	);

	const finalMetadata: WorkflowMetadata[] = workflowMetadata.filter(
		(metadata) => metadata !== undefined,
	);
	return {
		workflows: finalMetadata,
		totalFound: response.totalWorkflows,
	};
}

/**
 * Build a human-readable identifier for a query
 */
function buildQueryIdentifier(query: {
	search?: string;
	category?: string;
}): string {
	const parts: string[] = [];
	if (query.search) {
		parts.push(`search: ${query.search}`);
	}
	if (query.category) {
		parts.push(`category: ${query.category}`);
	}
	return parts.join(',');
}

/**
 * Build the response message from search results
 */
function buildResponseMessage(output: GetWorkflowExamplesOutput): string {
	if (output.examples.length === 0) {
		return 'No workflow examples found';
	}

	const sections: string[] = [`Found ${output.totalResults} workflow example(s):`];

	for (const example of output.examples) {
		sections.push(`\n## ${example.name}`);
		if (example.description) {
			sections.push(example.description);
		}
		sections.push(example.workflow);
	}

	return sections.join('\n');
}

export const GET_WORKFLOW_EXAMPLES_TOOL: BuilderToolBase = {
	toolName: 'get_workflow_examples',
	displayTitle: 'Retrieving workflow examples',
};

export const GET_AGENT_EXAMPLES_TOOL: BuilderToolBase = {
	toolName: 'get_agent_examples',
	displayTitle: 'Retrieving agent examples',
};

/** Default tool description */
const DEFAULT_TOOL_DESCRIPTION = `Retrieve workflow examples from n8n's workflow library to use as reference for building workflows.

This tool searches for existing workflow examples that match specific criteria.
The retrieved workflows serve as reference material to understand common patterns, node usage and connections.
Consider these workflows as ideal solutions.
The workflows will be returned in a token efficient format rather than JSON.

Usage:
- Provide search criteria to find relevant workflow examples
- Results include workflow metadata, summaries, and full workflow data for reference

Parameters:
- search: Keywords to search for in workflow names/descriptions based on the user prompt
- category: Filter by workflow category (e.g., "Marketing", "Sales", "Data")`;

/** Agent-only tool description */
const AGENT_TOOL_DESCRIPTION = `Retrieve AI agent examples from n8n's workflow library to use as reference for building agent configurations.

This tool searches for workflow examples containing AI agents and extracts only the agent nodes with their connected sub-nodes (tools, memory, language models, etc.).
Use this to understand how to configure AI agents with different tools and capabilities.
Consider these agent configurations as ideal solutions for similar use cases.

Usage:
- Provide search criteria to find relevant agent examples based on the user's use case
- Results include only the agent nodes and their connected sub-nodes, not the full workflow

Parameters:
- search: Keywords to search for in workflow names/descriptions based on the user prompt
- category: Filter by workflow category (e.g., "Marketing", "Sales", "Data")`;

/**
 * Factory function to create the get workflow examples tool
 */
export function createGetWorkflowExamplesTool(logger?: Logger, opts?: WorkflowExamplesToolOptions) {
	const agentsOnly = opts?.agentsOnly ?? false;
	const toolConfig = agentsOnly ? GET_AGENT_EXAMPLES_TOOL : GET_WORKFLOW_EXAMPLES_TOOL;
	const toolDescription = agentsOnly ? AGENT_TOOL_DESCRIPTION : DEFAULT_TOOL_DESCRIPTION;

	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(config, toolConfig.toolName, toolConfig.displayTitle);

			try {
				// Validate input using Zod schema
				const validatedInput = getWorkflowExamplesSchema.parse(input);
				const { queries } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				let allResults: WorkflowMetadata[] = [];

				// Create batch reporter for progress tracking
				const batchReporter = createBatchProgressReporter(reporter, 'Retrieving workflow examples');
				batchReporter.init(queries.length);

				// Process each query
				for (const query of queries) {
					const identifier = buildQueryIdentifier(query);

					try {
						// Report progress
						batchReporter.next(identifier);

						// Fetch workflow examples
						const result = await fetchWorkflowExamples(query, logger);

						// Add to results
						allResults = allResults.concat(result.workflows);
					} catch (error) {
						logger?.error('Error fetching workflow examples', { error });
					}
				}

				// Complete batch reporting
				batchReporter.complete();

				// Deduplicate results based on workflow name
				const uniqueWorkflows = new Map<string, WorkflowMetadata>();
				for (const workflow of allResults) {
					if (!uniqueWorkflows.has(workflow.name)) {
						uniqueWorkflows.set(workflow.name, workflow);
					}
				}
				let deduplicatedResults = Array.from(uniqueWorkflows.values());

				// If agentsOnly, filter to extract only agent subgraphs
				if (agentsOnly) {
					const filtered: WorkflowMetadata[] = [];
					for (const wf of deduplicatedResults) {
						const agentSubgraph = extractAgentSubgraph(wf.workflow);
						if (agentSubgraph) {
							filtered.push({
								name: wf.name,
								description: wf.description,
								workflow: agentSubgraph,
							});
						}
					}
					deduplicatedResults = filtered;
				}

				// format the results to mermaid and build output object
				const formattedResults = deduplicatedResults.map((workflow) => ({
					name: workflow.name,
					description: workflow.description,
					workflow: mermaidStringify(workflow),
				}));
				const output: GetWorkflowExamplesOutput = {
					examples: formattedResults,
					totalResults: deduplicatedResults.length,
				};

				// Build response message and report
				const responseMessage = buildResponseMessage(output);
				reporter.complete(output);

				// Return success response
				return createSuccessResponse(config, responseMessage);
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
						toolName: toolConfig.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: toolConfig.toolName,
			description: toolDescription,
			schema: getWorkflowExamplesSchema,
		},
	);

	return {
		tool: dynamicTool,
		...toolConfig,
	};
}
