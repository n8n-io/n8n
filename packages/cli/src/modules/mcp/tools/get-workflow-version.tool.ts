import type { User } from '@n8n/db';
import { ensureError, type IConnections, type IWorkflowGroup } from 'n8n-workflow';
import z from 'zod';

import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { connectionsSchema, nodeGroupSchema, nodeSchema } from './schemas';
import { getMcpWorkflowVersion } from './workflow-history.utils';
import { getMcpWorkflow } from './workflow-validation.utils';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow the version belongs to'),
	versionId: z.string().describe('The version ID to retrieve, as returned by get_workflow_history'),
} satisfies z.ZodRawShape;

const outputSchema = {
	success: z.boolean(),
	versionId: z.string(),
	workflowId: z.string(),
	authors: z.string().nullable().describe('Who authored this version'),
	name: z.string().nullable().describe('Optional named-version label'),
	description: z.string().nullable().describe('Optional named-version description'),
	createdAt: z.string().nullable().describe('ISO timestamp when the version was created'),
	updatedAt: z
		.string()
		.nullable()
		.describe('ISO timestamp when the version metadata was last updated'),
	nodes: z.array(nodeSchema).describe('The workflow nodes captured in this version'),
	connections: connectionsSchema.describe('The node connections captured in this version'),
	nodeGroups: z.array(nodeGroupSchema).describe('The node groups captured in this version'),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

type GetWorkflowVersionParams = { workflowId: string; versionId: string };
type GetWorkflowVersionResult = {
	versionId: string;
	workflowId: string;
	authors: string;
	name: string | null;
	description: string | null;
	createdAt: string;
	updatedAt: string;
	nodes: Array<Record<string, unknown>>;
	connections: IConnections;
	nodeGroups: IWorkflowGroup[];
};
type GetWorkflowVersionOutput = Omit<
	GetWorkflowVersionResult,
	'authors' | 'createdAt' | 'updatedAt'
> & {
	success: boolean;
	authors: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	error?: string;
};

/**
 * Creates the MCP tool definition for retrieving a single workflow version's
 * full content (nodes, connections, node groups). Credentials are stripped from
 * nodes before returning, mirroring get_workflow_details.
 */
export const createGetWorkflowVersionTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowHistoryService: WorkflowHistoryService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'get_workflow_version',
	config: {
		description:
			'Retrieve the full content (nodes, connections, node groups) of a specific workflow version from its history. Use the versionId from get_workflow_history.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get Workflow Version',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId, versionId }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_workflow_version',
			parameters: { workflowId, versionId },
		};

		try {
			const payload = await getWorkflowVersion(
				user,
				workflowFinderService,
				workflowHistoryService,
				{ workflowId, versionId },
			);

			const output: GetWorkflowVersionOutput = { success: true, ...payload };

			telemetryPayload.results = {
				success: true,
				data: { workflow_id: workflowId, version_id: versionId },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isAccessError = error instanceof WorkflowAccessError;

			const output: GetWorkflowVersionOutput = {
				success: false,
				versionId,
				workflowId,
				authors: null,
				name: null,
				description: null,
				createdAt: null,
				updatedAt: null,
				nodes: [],
				connections: {},
				nodeGroups: [],
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

export async function getWorkflowVersion(
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowHistoryService: WorkflowHistoryService,
	{ workflowId, versionId }: GetWorkflowVersionParams,
): Promise<GetWorkflowVersionResult> {
	// Enforce the MCP access gate (scope + not-archived + availableInMCP) before reading the version.
	await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

	const version = await getMcpWorkflowVersion(workflowHistoryService, user, workflowId, versionId);

	const nodes = (version.nodes ?? []).map(({ credentials: _credentials, ...node }) => node);

	return {
		versionId: version.versionId,
		workflowId: version.workflowId,
		authors: version.authors,
		name: version.name,
		description: version.description,
		createdAt: version.createdAt.toISOString(),
		updatedAt: version.updatedAt.toISOString(),
		nodes,
		connections: version.connections ?? {},
		nodeGroups: version.nodeGroups ?? [],
	};
}
