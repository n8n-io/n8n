import type { User } from '@n8n/db';
import { ExecutionStatusList, WorkflowExecuteModeList, type ExecutionStatus } from 'n8n-workflow';
import z from 'zod';

import type { ExecutionService } from '@/executions/execution.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createLimitSchema } from './schemas';
import { getMcpWorkflow } from './workflow-validation.utils';

const MAX_RESULTS = 200;

const inputSchema = {
	workflowId: z.string().optional().describe('Filter executions by workflow ID'),
	status: z
		.array(z.enum(ExecutionStatusList))
		.optional()
		.describe('Filter by execution status(es)'),
	startedAfter: z
		.string()
		.datetime({ offset: true })
		.optional()
		.describe('ISO 8601 timestamp — only return executions that started after this time'),
	startedBefore: z
		.string()
		.datetime({ offset: true })
		.optional()
		.describe('ISO 8601 timestamp — only return executions that started before this time'),
	limit: createLimitSchema(MAX_RESULTS),
	lastId: z
		.string()
		.optional()
		.describe('Cursor for pagination — pass the last execution ID from the previous page'),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.array(
			z.object({
				id: z.string().describe('The unique identifier of the execution'),
				workflowId: z.string().describe('The workflow this execution belongs to'),
				status: z.enum(ExecutionStatusList).describe('The execution status'),
				mode: z.enum(WorkflowExecuteModeList).describe('How the execution was triggered'),
				startedAt: z.string().nullable().describe('ISO timestamp when the execution started'),
				stoppedAt: z.string().nullable().describe('ISO timestamp when the execution stopped'),
				waitTill: z
					.string()
					.nullable()
					.describe('ISO timestamp until when the execution is waiting'),
			}),
		)
		.describe('List of executions matching the query'),
	count: z
		.union([z.literal(-1), z.number().int().min(0)])
		.describe('Total matching executions, or -1 if the count is unavailable'),
	estimated: z.boolean().describe('Whether the count is an estimate (for large datasets)'),
	error: z.string().optional().describe('Error message if the query failed'),
} satisfies z.ZodRawShape;

export const createSearchExecutionsTool = (
	user: User,
	executionService: ExecutionService,
	workflowFinderService: WorkflowFinderService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'search_executions',
	config: {
		description:
			'Search for workflow executions with optional filters. Returns execution metadata including status, timing, and workflow ID.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Search Executions',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		workflowId,
		status,
		startedAfter,
		startedBefore,
		limit = MAX_RESULTS,
		lastId,
	}: {
		workflowId?: string;
		status?: ExecutionStatus[];
		startedAfter?: string;
		startedBefore?: string;
		limit?: number;
		lastId?: string;
	}) => {
		const parameters = { workflowId, status, startedAfter, startedBefore, limit, lastId };
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'search_executions',
			parameters,
		};

		try {
			// Validate workflow access if workflowId is provided
			if (workflowId) {
				await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);
			}

			const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);
			const sharingOptions = await executionService.buildSharingOptions('workflow:read');

			const query = {
				kind: 'range' as const,
				user,
				sharingOptions,
				range: {
					limit: safeLimit,
					...(lastId ? { lastId } : {}),
				},
				order: { startedAt: 'DESC' as const },
				...(workflowId ? { workflowId } : {}),
				...(status?.length ? { status } : {}),
				...(startedAfter ? { startedAfter } : {}),
				...(startedBefore ? { startedBefore } : {}),
				isArchived: false,
				workflowBooleanSettings: [{ key: 'availableInMCP', value: true }],
			};

			const { results, count, estimated } = await executionService.findRangeWithCount(query);

			const data = results.map((execution) => ({
				id: execution.id,
				workflowId: execution.workflowId,
				status: execution.status,
				mode: execution.mode,
				startedAt: execution.startedAt ?? null,
				stoppedAt: execution.stoppedAt ?? null,
				waitTill: execution.waitTill ?? null,
			}));

			const payload = { data, count, estimated };

			telemetryPayload.results = {
				success: true,
				data: { count, estimated },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				structuredContent: payload,
				content: [{ type: 'text', text: JSON.stringify(payload) }],
			};
		} catch (er) {
			const error = er instanceof Error ? er : new Error(String(er));
			const isAccessError = error instanceof WorkflowAccessError;

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { data: [], count: 0, estimated: false, error: error.message };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
