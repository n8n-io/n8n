import type { ExecutionRepository, User } from '@n8n/db';
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
	data: z.unknown().optional().describe('Full execution result data'),
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
		description: 'Get full execution details and results using the execution ID and workflow ID',
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
	handler: async ({ workflowId, executionId }: z.infer<typeof inputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_execution',
			parameters: { workflowId, executionId },
		};

		try {
			await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

			// Retrieve the execution with full data
			const execution = await executionRepository.findWithUnflattenedData(executionId, [
				workflowId,
			]);

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

			const output = {
				execution: {
					id: execution.id,
					workflowId: execution.workflowId,
					mode: execution.mode,
					status: execution.status,
					startedAt: execution.startedAt?.toISOString() ?? null,
					stoppedAt: execution.stoppedAt?.toISOString() ?? null,
					retryOf: execution.retryOf ?? null,
					retrySuccessId: execution.retrySuccessId ?? null,
					waitTill: execution.waitTill?.toISOString() ?? null,
				},
				data: execution.data,
			};

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
