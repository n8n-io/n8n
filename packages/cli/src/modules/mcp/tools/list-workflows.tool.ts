import { type User, type WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { nodeSchema } from './schemas';

import type { ListQuery } from '@/requests';
import type { Telemetry } from '@/telemetry';
import type { WorkflowService } from '@/workflows/workflow.service';

const MAX_RESULTS = 200;

const inputSchema = {
	limit: z
		.number()
		.int()
		.positive()
		.max(MAX_RESULTS)
		.optional()
		.describe(`Limit the number of results (max ${MAX_RESULTS})`),
	query: z.string().optional().describe('Filter by name or description'),
	projectId: z.string().optional(),
	activeOnly: z.boolean().optional().describe('Only return active workflows. Defaults to false.'),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.array(
			z.object({
				id: z.string().describe('The unique identifier of the workflow'),
				name: z.string().nullable().describe('The name of the workflow'),
				description: z.string().nullable().optional().describe('The description of the workflow'),
				active: z.boolean().nullable().describe('Whether the workflow is active'),
				createdAt: z
					.string()
					.nullable()
					.describe('The ISO timestamp when the workflow was created'),
				updatedAt: z
					.string()
					.nullable()
					.describe('The ISO timestamp when the workflow was last updated'),
				triggerCount: z
					.number()
					.nullable()
					.describe('The number of triggers associated with the workflow'),
				nodes: z.array(nodeSchema).describe('List of nodes in the workflow'),
				scopes: z.array(z.string()).describe('User permissions for this workflow'),
			}),
		)
		.describe('List of workflows matching the query'),
	count: z.number().int().min(0).describe('Total number of workflows that match the filters'),
} satisfies z.ZodRawShape;

/**
 * Creates mcp tool definition for listing all workflows accessible to the user.
 * Unlike search_workflows, this does not filter by availableInMCP or active status,
 * making it suitable for discovering workflows to view or edit.
 */
export const createListWorkflowsTool = (
	user: User,
	workflowService: WorkflowService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'list_workflows',
		config: {
			description:
				'List all workflows accessible to the user. Unlike search_workflows, this returns all workflows regardless of MCP availability or active status. Use this to discover workflows for viewing or editing.',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'List Workflows',
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		handler: async ({
			limit = MAX_RESULTS,
			query,
			projectId,
			activeOnly,
		}: {
			limit?: number;
			query?: string;
			projectId?: string;
			activeOnly?: boolean;
		}) => {
			const parameters = { limit, query, projectId, activeOnly };
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: 'list_workflows',
				parameters,
			};

			try {
				const payload = await listWorkflows(user, workflowService, {
					limit,
					query,
					projectId,
					activeOnly,
				});

				telemetryPayload.results = {
					success: true,
					data: {
						count: payload.count,
					},
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return {
					structuredContent: payload,
					content: [
						{
							type: 'text',
							text: JSON.stringify(payload),
						},
					],
				};
			} catch (error) {
				telemetryPayload.results = {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				throw error;
			}
		},
	};
};

export async function listWorkflows(
	user: User,
	workflowService: WorkflowService,
	{
		limit = MAX_RESULTS,
		query,
		projectId,
		activeOnly,
	}: { limit?: number; query?: string; projectId?: string; activeOnly?: boolean },
) {
	const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);

	const options: ListQuery.Options = {
		take: safeLimit,
		filter: {
			isArchived: false,
			...(activeOnly ? { active: true } : {}),
			...(query ? { query } : {}),
			...(projectId ? { projectId } : {}),
		},
		select: {
			id: true,
			activeVersionId: true,
			name: true,
			description: true,
			active: true,
			createdAt: true,
			updatedAt: true,
			triggerCount: true,
			activeVersion: true,
			ownedBy: true,
		},
	};

	const { workflows, count } = await workflowService.getMany(
		user,
		options,
		true, // includeScopes
		false, // includeFolders
		false, // onlySharedWithMe
	);

	const formattedWorkflows = workflows.map((workflow) => {
		const {
			id,
			name,
			description,
			activeVersionId,
			createdAt,
			updatedAt,
			triggerCount,
			activeVersion,
		} = workflow as WorkflowEntity;
		const scopes = ('scopes' in workflow ? (workflow.scopes as string[]) : undefined) ?? [];

		return {
			id,
			name,
			description,
			active: activeVersionId !== null,
			createdAt: createdAt.toISOString(),
			updatedAt: updatedAt.toISOString(),
			triggerCount,
			nodes: (activeVersion?.nodes ?? []).map((node: INode) => ({
				name: node.name,
				type: node.type,
			})),
			scopes,
		};
	});

	return { data: formattedWorkflows, count };
}
