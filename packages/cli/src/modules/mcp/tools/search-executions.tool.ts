import type { User } from '@n8n/db';
import { ExecutionStatusList, WorkflowExecuteModeList, type ExecutionStatus } from 'n8n-workflow';
import z from 'zod';

import type { ExecutionService } from '@/executions/execution.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
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
	count: z.number().int().min(0).describe('Total number of executions matching the filters'),
	estimated: z.boolean().describe('Whether the count is an estimate (for large datasets)'),
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
		limit = MAX_RESULTS,
		lastId,
	}: {
		workflowId?: string;
		status?: ExecutionStatus[];
		limit?: number;
		lastId?: string;
	}) => {
		const parameters = { workflowId, status, limit, lastId };
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
			};

			const { results, count, estimated } = await executionService.findMcpRangeWithCount(query);

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
				content: [{ type: 'text', text: jsonStringify(payload) }],
			};
		} catch (er) {
			const error = ensureError(er);

			telemetryPayload.results = {
				success: false,
				error: error.message ?? String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			throw error;
		}
	},
});
