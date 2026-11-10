import { Logger } from '@n8n/backend-common';
import { type ExecutionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { formatRedactedError } from '@n8n/instance-ai/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type {
	ExecutionStatus,
	IPinData,
	IRunData,
	IRunExecutionData,
	ITaskDataConnections,
} from 'n8n-workflow';
import { jsonStringify, replaceCircularReferences } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { getMcpWorkflow } from './workflow-validation.utils';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { loadExecutionForViewer } from '@/executions/execution-viewer-reader';
import type { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow the execution belongs to'),
	executionId: z.string().describe('The ID of the execution to retrieve'),
	includeData: z
		.boolean()
		.optional()
		.describe(
			'Whether to include the full execution result data. Defaults to false (metadata only). Set to true to include node inputs/outputs. Use `false` to quickly check execution status',
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

const FAILURE_DESCRIPTION_MAX_LENGTH = 500;

const FAILED_EXECUTION_STATUSES: ExecutionStatus[] = ['error', 'crashed'];

const failureSchema = z
	.object({
		nodeName: z.string().optional(),
		message: z.string(),
		description: z.string().optional(),
	})
	.optional()
	.describe(
		'Summary of the failure for executions with status error or crashed (only present when includeData is false)',
	);

type ExecutionFailure = z.infer<typeof failureSchema>;

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
			failure: failureSchema,
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
	executionRedactionServiceProxy: ExecutionRedactionServiceProxy,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'get_workflow_execution',
	config: {
		description:
			'Get workflow execution details by execution ID and workflow ID. By default returns metadata only. Set includeData to true to include node execution data, optionally filtered by nodeNames and truncated by truncateData. The metadata of a failed execution includes the failed node and the error message, so includeData is not necessary to find the cause of the failure.',
		inputSchema: inputSchema.shape,
		outputSchema,
		annotations: {
			title: 'Get Workflow Execution',
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
			tool_name: 'get_workflow_execution',
			parameters: { workflowId, executionId, includeData, nodeNames, truncateData },
		};

		try {
			await getMcpWorkflow(
				workflowId,
				user,
				['workflow:read', 'execution:read'],
				workflowFinderService,
			);

			// Use lightweight metadata query when data isn't needed;
			// split into branches so TypeScript can narrow each return type.
			let execution;
			let executionData: IRunExecutionData | null | undefined;
			let failure: ExecutionFailure;
			if (includeData) {
				const fullExecution = await Container.get(ExecutionPersistence).findWithUnflattenedData(
					executionId,
					[workflowId],
				);

				if (fullExecution) {
					// Redacts in place, modifying fullExecution internally
					await executionRedactionServiceProxy.processExecution(fullExecution, { user });
				}

				execution = fullExecution;
				executionData = fullExecution?.data ?? null;
			} else {
				execution = await executionRepository.findIfAccessible(executionId, [workflowId]);
				if (execution && FAILED_EXECUTION_STATUSES.includes(execution.status)) {
					failure = await findFailureSummary(executionId, user);
				}
			}

			if (!execution) {
				throw new WorkflowAccessError(
					`Execution '${executionId}' not found for workflow '${workflowId}'`,
					'execution_not_found',
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
				...(failure && { failure }),
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

			// `structuredContent` is JSON-serialized by the MCP SDK transport, so
			// cycles in `output` (e.g. the HTTP socket loop in
			// `executionData.contextData`) hang the call unless replaced here.
			const safeOutput = replaceCircularReferences(output);

			return {
				content: [{ type: 'text', text: JSON.stringify(safeOutput) }],
				structuredContent: safeOutput,
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

			const safeOutput = replaceCircularReferences(output);

			return {
				content: [{ type: 'text', text: JSON.stringify(safeOutput) }],
				structuredContent: safeOutput,
			};
		}
	},
});

async function findFailureSummary(executionId: string, user: User): Promise<ExecutionFailure> {
	try {
		const execution = await loadExecutionForViewer(executionId, user);
		return execution && toFailureSummary(execution.data.resultData);
	} catch (error) {
		Container.get(Logger).warn('MCP get_workflow_execution could not load the failure summary', {
			executionId,
			error: ensureError(error),
		});
		return undefined;
	}
}

function findFailedNodeName({ runData, lastNodeExecuted }: IRunExecutionData['resultData']) {
	const lastRunStatus = (nodeName: string) => runData?.[nodeName]?.at(-1)?.executionStatus;
	const isFailed = (status?: ExecutionStatus) =>
		status !== undefined && FAILED_EXECUTION_STATUSES.includes(status);

	if (lastNodeExecuted) {
		const status = lastRunStatus(lastNodeExecuted);
		if (status === undefined || isFailed(status)) return lastNodeExecuted;
	}
	return Object.keys(runData ?? {}).find((nodeName) => isFailed(lastRunStatus(nodeName)));
}

function toFailureSummary(resultData: IRunExecutionData['resultData']): ExecutionFailure {
	const { error, redactedError } = resultData;
	const failedNodeName = findFailedNodeName(resultData);
	const nodeName = failedNodeName ? { nodeName: failedNodeName } : {};
	if (redactedError) return { ...nodeName, message: formatRedactedError(redactedError) };
	if (!error) return undefined;

	return {
		...nodeName,
		message: error.message,
		...(error.description && {
			description: error.description.slice(0, FAILURE_DESCRIPTION_MAX_LENGTH),
		}),
	};
}

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
