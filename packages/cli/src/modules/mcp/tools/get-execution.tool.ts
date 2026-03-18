import type { ExecutionRepository, User } from '@n8n/db';
import type { IRunExecutionData, IRunData, ITaskDataConnections, IPinData } from 'n8n-workflow';
import { jsonStringify, ensureError } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { getMcpWorkflow } from './workflow-validation.utils';

import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow the execution belongs to'),
	executionId: z.string().describe('The ID of the execution to retrieve'),
	includeData: z
		.boolean()
		.optional()
		.describe(
			'Whether to include the full execution result data. Defaults to false (metadata only). Set to true to include node inputs/outputs.',
		),
	nodeNames: z
		.array(z.string())
		.optional()
		.describe(
			'When includeData is true, return data only for these node names. If omitted, data for all nodes is included.',
		),
	truncateData: z
		.number()
		.int()
		.positive()
		.optional()
		.describe(
			'When includeData is true, limit the number of data items returned per node output to this value. If omitted, all items are returned.',
		),
});

const outputSchema = {
	execution: z
		.object({
			id: z.string(),
			workflowId: z.string(),
			mode: z.string(),
			status: z.string(),
			startedAt: z.string().nullable(),
			stoppedAt: z.string().nullable(),
			retryOf: z.string().nullable().optional(),
			retrySuccessId: z.string().nullable().optional(),
			waitTill: z.string().nullable().optional(),
		})
		.passthrough()
		.nullable()
		.describe('Execution metadata, or null if an error occurred'),
	data: z
		.unknown()
		.optional()
		.describe('Execution result data (only present when includeData is true)'),
	error: z.string().optional().describe('Error message if the request failed'),
} satisfies z.ZodRawShape;

export const createGetExecutionTool = (
	user: User,
	executionRepository: ExecutionRepository,
	workflowFinderService: WorkflowFinderService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'get_execution',
	config: {
		description:
			'Get execution details by execution ID and workflow ID. By default returns metadata only. Set includeData to true to include node execution data, optionally filtered by nodeNames and truncated by truncateData.',
		inputSchema: inputSchema.shape,
		outputSchema,
		annotations: {
			title: 'Get Execution',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		workflowId,
		executionId,
		includeData,
		nodeNames,
		truncateData,
	}: z.infer<typeof inputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_execution',
			parameters: { workflowId, executionId, includeData, nodeNames, truncateData },
		};

		try {
			await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

			// Use lightweight metadata query when data isn't needed;
			// split into branches so TypeScript can narrow each return type.
			let execution;
			let executionData: IRunExecutionData | null | undefined;
			if (includeData) {
				const fullExecution = await executionRepository.findWithUnflattenedData(executionId, [
					workflowId,
				]);
				execution = fullExecution;
				executionData = fullExecution?.data ?? null;
			} else {
				execution = await executionRepository.findIfAccessible(executionId, [workflowId]);
			}

			if (!execution) {
				// Check if execution exists at all
				const executionExists = await executionRepository.existsBy({ id: executionId });
				if (!executionExists) {
					throw new WorkflowAccessError(
						`Execution with ID '${executionId}' does not exist`,
						'execution_does_not_exist',
					);
				}

				throw new WorkflowAccessError(
					`Execution '${executionId}' does not belong to workflow '${workflowId}'`,
					'execution_workflow_mismatch',
				);
			}

			const executionMeta = {
				id: execution.id,
				workflowId: execution.workflowId,
				mode: execution.mode,
				status: execution.status,
				startedAt: execution.startedAt?.toISOString() ?? null,
				stoppedAt: execution.stoppedAt?.toISOString() ?? null,
				retryOf: execution.retryOf ?? null,
				retrySuccessId: execution.retrySuccessId ?? null,
				waitTill: execution.waitTill?.toISOString() ?? null,
			};

			let filteredData: IRunExecutionData | null | undefined;
			if (executionData) {
				filteredData = executionData;
				if (nodeNames !== undefined || truncateData) {
					filteredData = filterExecutionData(filteredData, nodeNames, truncateData);
				}
			} else if (executionData === null) {
				filteredData = null;
			}

			const output =
				filteredData !== undefined
					? { execution: executionMeta, data: filteredData }
					: { execution: executionMeta };

			telemetryPayload.results = {
				success: true,
				data: {
					executionId,
					status: execution.status,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isAccessError = error instanceof WorkflowAccessError;

			const errorInfo: Record<string, unknown> = {
				message: error.message || 'Unknown error',
				name: error.constructor.name,
			};

			if ('extra' in error && error.extra) {
				errorInfo.extra = error.extra;
			}
			if (error.cause) {
				errorInfo.cause =
					error.cause instanceof Error ? error.cause.message : jsonStringify(error.cause);
			}

			const output = {
				execution: null,
				error: error.message ?? `${error.constructor.name}: (no message)`,
			};

			telemetryPayload.results = {
				success: false,
				error: errorInfo,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		}
	},
});

function filterExecutionData(
	data: IRunExecutionData,
	nodeNames?: string[],
	truncateData?: number,
): IRunExecutionData {
	// Shallow clone is sufficient — the result is serialized immediately and never mutated
	const filtered = { ...data, resultData: { ...data.resultData } };

	let runData = filtered.resultData.runData ?? {};

	if (nodeNames !== undefined) {
		const filteredRunData: IRunData = {};
		for (const name of nodeNames) {
			if (name in runData) {
				filteredRunData[name] = runData[name];
			}
		}
		runData = filteredRunData;

		if (filtered.resultData.pinData) {
			const filteredPinData: IPinData = {};
			for (const name of nodeNames) {
				if (name in filtered.resultData.pinData) {
					filteredPinData[name] = filtered.resultData.pinData[name];
				}
			}
			filtered.resultData.pinData = filteredPinData;
		}
	}

	if (truncateData) {
		const truncated: IRunData = {};
		for (const [nodeName, taskDataArray] of Object.entries(runData)) {
			truncated[nodeName] = taskDataArray.map((taskData) => {
				if (!taskData.data) return taskData;
				const truncatedConnections: ITaskDataConnections = {};
				for (const [connType, outputs] of Object.entries(taskData.data)) {
					truncatedConnections[connType] = outputs.map((items) =>
						items ? items.slice(0, truncateData) : items,
					);
				}
				return { ...taskData, data: truncatedConnections };
			});
		}
		runData = truncated;
	}

	filtered.resultData.runData = runData;

	return filtered;
}
