import type { User } from '@n8n/db';
import { ensureError } from 'n8n-workflow';
import z from 'zod';

import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createLimitSchema } from './schemas';
import { getMcpWorkflow } from './workflow-validation.utils';

const MAX_RESULTS = 50;

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to read version history for'),
	limit: createLimitSchema(MAX_RESULTS),
	offset: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe('Number of versions to skip for pagination (default 0)'),
} satisfies z.ZodRawShape;

const versionSummarySchema = z.object({
	versionId: z.string().describe('The version ID, usable with get_workflow_version'),
	authors: z.string().describe('Who authored this version'),
	name: z.string().nullable().describe('Optional named-version label'),
	description: z.string().nullable().describe('Optional named-version description'),
	autosaved: z.boolean().describe('Whether this version was autosaved'),
	createdAt: z.string().describe('ISO timestamp when the version was created'),
	updatedAt: z.string().describe('ISO timestamp when the version metadata was last updated'),
});

const outputSchema = {
	success: z.boolean(),
	workflowId: z.string(),
	versions: z
		.array(versionSummarySchema)
		.describe('Versions ordered newest first. Older versions may be pruned by retention settings.'),
	count: z.number().describe('Number of versions returned in this page'),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

type GetWorkflowHistoryParams = { workflowId: string; limit?: number; offset?: number };
type GetWorkflowHistoryResult = {
	workflowId: string;
	versions: Array<z.infer<typeof versionSummarySchema>>;
	count: number;
};
type GetWorkflowHistoryOutput = GetWorkflowHistoryResult & { success: boolean; error?: string };

/**
 * Creates the MCP tool definition for listing a workflow's version history
 * (metadata only — no nodes/connections). Use get_workflow_version to fetch a
 * single version's full content.
 */
export const createGetWorkflowHistoryTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowHistoryService: WorkflowHistoryService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'get_workflow_history',
	config: {
		description:
			'List the saved version history of a workflow (newest first), so you can inspect how it changed over time and pick a version to retrieve or restore.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get Workflow History',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId, limit = MAX_RESULTS, offset = 0 }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_workflow_history',
			parameters: { workflowId, limit, offset },
		};

		try {
			const payload = await getWorkflowHistory(
				user,
				workflowFinderService,
				workflowHistoryService,
				{ workflowId, limit, offset },
			);

			const output: GetWorkflowHistoryOutput = { success: true, ...payload };

			telemetryPayload.results = {
				success: true,
				data: { workflow_id: workflowId, version_count: payload.count },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isAccessError = error instanceof WorkflowAccessError;

			const output: GetWorkflowHistoryOutput = {
				success: false,
				workflowId,
				versions: [],
				count: 0,
				error: error.message,
			};

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});

export async function getWorkflowHistory(
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowHistoryService: WorkflowHistoryService,
	{ workflowId, limit = MAX_RESULTS, offset = 0 }: GetWorkflowHistoryParams,
): Promise<GetWorkflowHistoryResult> {
	// Enforce the MCP access gate (scope + not-archived + availableInMCP) before reading history.
	await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

	const versions = await workflowHistoryService.getList(user, workflowId, limit, offset);

	const formatted = versions.map((version) => ({
		versionId: version.versionId,
		authors: version.authors,
		name: version.name,
		description: version.description,
		autosaved: version.autosaved,
		createdAt: version.createdAt.toISOString(),
		updatedAt: version.updatedAt.toISOString(),
	}));

	return { workflowId, versions: formatted, count: formatted.length };
}
