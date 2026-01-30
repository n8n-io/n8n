import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { IRunData } from 'n8n-workflow';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '../errors';
import type { GetExecutionLogsOutput } from '../types/tools';
import type { BuilderTool, BuilderToolBase } from '../utils/stream-processor';
import { truncateJson } from '../utils/truncate-json';
import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getWorkflowState } from './helpers/state';

const DISPLAY_TITLE = 'Getting execution logs';

/**
 * Schema for getting execution logs
 */
const getExecutionLogsSchema = z.object({
	nodeName: z
		.string()
		.optional()
		.describe('Optional: Filter to get execution logs for a specific node only'),
});

function formatExecutionLogs(
	runData: IRunData | undefined,
	error: unknown,
	lastNodeExecuted: string | undefined,
	nodeName?: string,
): string {
	const parts: string[] = [];

	// Add error information if present
	if (error) {
		parts.push('<execution_error>');
		if (lastNodeExecuted) {
			parts.push(`  <last_node_executed>${lastNodeExecuted}</last_node_executed>`);
		}
		parts.push('  <error_details>');
		parts.push(truncateJson(error));
		parts.push('  </error_details>');
		parts.push('</execution_error>');
	}

	// Add run data
	if (runData && Object.keys(runData).length > 0) {
		parts.push('<execution_run_data>');

		const filtered = nodeName
			? Object.fromEntries(Object.entries(runData).filter(([key]) => key === nodeName))
			: runData;

		if (Object.keys(filtered).length > 0) {
			parts.push(truncateJson(filtered));
		} else if (nodeName) {
			parts.push(`No execution data found for node "${nodeName}"`);
		}

		parts.push('</execution_run_data>');
	}

	if (parts.length === 0) {
		return nodeName
			? `No execution logs found for node "${nodeName}"`
			: 'No execution logs available. The workflow may not have been executed yet.';
	}

	return parts.join('\n');
}

export const GET_EXECUTION_LOGS_TOOL: BuilderToolBase = {
	toolName: 'get_execution_logs',
	displayTitle: DISPLAY_TITLE,
};

/**
 * Factory function to create the get execution logs tool
 */
export function createGetExecutionLogsTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				GET_EXECUTION_LOGS_TOOL.toolName,
				DISPLAY_TITLE,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = getExecutionLogsSchema.parse(input);
				const { nodeName } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const executionData = state.workflowContext?.executionData;

				const runData = executionData?.runData;
				const error = executionData?.error;
				const lastNodeExecuted = executionData?.lastNodeExecuted;

				logger?.debug(
					`Getting execution logs${nodeName ? ` for node ${nodeName}` : ''}, hasError: ${!!error}, runData nodes: ${runData ? Object.keys(runData).length : 0}`,
				);

				// Format the response
				const formattedLogs = formatExecutionLogs(runData, error, lastNodeExecuted, nodeName);

				const nodeCount = runData ? Object.keys(runData).length : 0;
				const output: GetExecutionLogsOutput = {
					hasError: !!error,
					lastNodeExecuted,
					nodesWithData: nodeCount,
					message:
						nodeCount > 0 || error ? 'Execution logs retrieved' : 'No execution logs available',
				};
				reporter.complete(output);

				// Return success response
				return createSuccessResponse(config, formattedLogs);
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
						toolName: GET_EXECUTION_LOGS_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_EXECUTION_LOGS_TOOL.toolName,
			description:
				'Get the execution logs including run data and error information from the last workflow execution. Use this to debug workflow errors or understand execution results.',
			schema: getExecutionLogsSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_EXECUTION_LOGS_TOOL,
	};
}
