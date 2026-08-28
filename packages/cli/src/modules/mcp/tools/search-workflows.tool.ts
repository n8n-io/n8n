import { folderIdSchema } from '@n8n/api-types';
import { type User, type WorkflowEntity } from '@n8n/db';
import { PROJECT_ROOT } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { SEARCH_WORKFLOWS_SORT_BY_VALUES } from '../mcp.types';
import type {
	ToolDefinition,
	SearchWorkflowsParams,
	SearchWorkflowsResult,
	SearchWorkflowsItem,
	SearchWorkflowsSortBy,
	UserCalledMCPToolEventPayload,
} from '../mcp.types';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import type { ListQuery } from '@/requests';
import type { FolderFinderService } from '@/services/folder-finder.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowService } from '@/workflows/workflow.service';
import { describeFolderError } from './folder-error.utils';
import { createLimitSchema, tagSchema, toTagSummary } from './schemas';

const MAX_RESULTS = 200;

// Folder ids are nanoids, but imported folders can carry an id minted elsewhere,
// which is why `folderIdSchema` allows up to 36 characters. Match that tolerance
// and only reject shapes no id can take — an empty string, or the folder *name*
// an LLM may send instead of an id.
const FOLDER_ID_PATTERN = /^[A-Za-z0-9-]+$/;

const DEFAULT_SORT_BY: SearchWorkflowsSortBy = 'updatedAt:desc';

const inputSchema = {
	limit: createLimitSchema(MAX_RESULTS),
	query: z.string().optional().describe('Filter by name or description'),
	projectId: z.string().optional(),
	tags: z
		.array(z.string())
		.optional()
		.describe('Filter by tag names (AND semantics — workflow must have all).'),
	sortBy: z
		.enum(SEARCH_WORKFLOWS_SORT_BY_VALUES)
		.optional()
		.describe(
			`Sort order for results (default: ${DEFAULT_SORT_BY}). Use updatedAt:desc to find the most recently edited workflows first.`,
		),
	folderId: folderIdSchema
		.refine((id) => id === PROJECT_ROOT || FOLDER_ID_PATTERN.test(id), {
			message: `Must be a folder id, or "${PROJECT_ROOT}" for the project root`,
		})
		.optional()
		.describe(
			`Filter by folder. Pass a parentFolderId from an earlier result to find a workflow's siblings, or — when search_folders is available — use it to resolve a folder name to an id first. Pass "${PROJECT_ROOT}" for workflows that sit at the project root rather than in a folder.`,
		),
	includeSubfolders: z
		.boolean()
		.optional()
		.describe(
			`Whether a folderId search also covers that folder's subfolders (default: true). Set false to match only workflows directly inside the folder. Ignored when folderId is "${PROJECT_ROOT}", which always matches the project root only.`,
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.array(
			z
				.object({
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
						.describe(
							'ISO timestamp the workflow definition was last saved. Use this to identify recently edited workflows.',
						),
					triggerCount: z
						.number()
						.nullable()
						.describe('The number of triggers associated with the workflow'),
					availableInMCP: z.boolean().describe('Whether the workflow is visible to MCP tools'),
					parentFolderId: z
						.string()
						.nullable()
						.describe(
							'The id of the folder holding the workflow, or null when it sits at the project root. Pass it back as folderId to find related workflows.',
						),
					tags: z.array(tagSchema).describe('Tags assigned to the workflow'),
				})
				.passthrough(),
		)
		.describe('List of workflows matching the query'),
	count: z.number().int().min(0).describe('Total number of workflows that match the filters'),
	error: z
		.string()
		.optional()
		.describe('Error message explaining why the search failed. Present only on failure.'),
} satisfies z.ZodRawShape;

/**
 * 	Creates mcp tool definition for searching workflows with optional filters. Workflows can be filtered by name, project ID, folder, and tags.
 * Returns a preview of each workflow including id, name, active status, creation and update timestamps, trigger count, folder and tags.
 */
export const createSearchWorkflowsTool = (
	user: User,
	workflowService: WorkflowService,
	folderFinderService: FolderFinderService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'search_workflows',
		config: {
			description:
				'Search for workflows with optional filters. Returns a preview of each workflow. Where workflows are organised into folders, narrow the search with folderId instead of scanning everything: reuse a parentFolderId from an earlier result, or resolve a folder name with search_folders when that tool is available.',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Search Workflows',
				readOnlyHint: true, // This tool only reads data
				destructiveHint: false, // No destructive operations
				idempotentHint: true, // Safe to retry multiple times
				openWorldHint: false, // Works with internal n8n data only
			},
		},
		handler: async ({
			limit = MAX_RESULTS,
			query,
			projectId,
			tags,
			sortBy,
			folderId,
			includeSubfolders,
		}: SearchWorkflowsParams) => {
			const parameters = { limit, query, projectId, tags, sortBy, folderId, includeSubfolders };
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: 'search_workflows',
				parameters,
			};

			try {
				const payload: SearchWorkflowsResult = await searchWorkflows(
					user,
					workflowService,
					folderFinderService,
					{
						limit,
						query,
						projectId,
						tags,
						sortBy,
						folderId,
						includeSubfolders,
					},
				);

				// Track successful execution
				telemetryPayload.results = {
					success: true,
					data: {
						count: payload.count,
					},
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return {
					structuredContent: payload,
					// Keeping text content for compatibility with mcp clients that don's support structuredContent
					content: [
						{
							type: 'text',
							text: JSON.stringify(payload),
						},
					],
				};
			} catch (error) {
				// Track failed execution
				telemetryPayload.results = {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				// An unresolvable folderId is a recoverable mistake: hand the client a
				// structured error pointing at search_folders rather than throwing, so it
				// can retry with a valid id. Never fall back to an unfiltered search —
				// silently widening the scope is worse than failing.
				if (error instanceof FolderNotFoundError) {
					const output: SearchWorkflowsResult = {
						data: [],
						count: 0,
						error: describeFolderError(error),
					};
					return {
						structuredContent: output,
						content: [{ type: 'text', text: JSON.stringify(output) }],
						isError: true,
					};
				}

				throw error;
			}
		},
	};
};

/**
 * Turns a requested `folderId` into the folder filter the workflow query
 * understands. A subfolder search resolves the whole subtree up front because
 * the plain workflow list query — unlike the workflows-and-folders union the UI
 * uses — matches `parentFolderId` literally and never walks the hierarchy.
 *
 * The resolved ids only narrow a query that already filters to the workflows the
 * user may read, so they need no folder-level permission check of their own —
 * the same split the workflow list endpoint makes. An id that matches no folder
 * raises, so a wrong id can never be mistaken for an empty folder.
 */
async function resolveFolderFilter(
	folderFinderService: FolderFinderService,
	folderId: string,
	includeSubfolders: boolean,
): Promise<{ parentFolderId: string } | { parentFolderIds: string[] }> {
	// The project root is not a folder, so there is no subtree to expand: it
	// matches workflows with no parent folder.
	if (folderId === PROJECT_ROOT) return { parentFolderId: PROJECT_ROOT };

	// Resolved without a folder permission check on purpose: these ids only narrow
	// the workflow query below, which keeps enforcing workflow access on its own, so
	// a member can still filter by the parentFolderId this tool reported for a
	// workflow shared out of a project they do not belong to.
	const folderIds = await folderFinderService.findFolderFilterIdsWithoutAccessCheck(
		folderId,
		includeSubfolders,
	);
	if (folderIds.length === 0) throw new FolderNotFoundError(folderId);

	return { parentFolderIds: folderIds };
}

export async function searchWorkflows(
	user: User,
	workflowService: WorkflowService,
	folderFinderService: FolderFinderService,
	{
		limit = MAX_RESULTS,
		query,
		projectId,
		tags,
		sortBy = DEFAULT_SORT_BY,
		folderId,
		includeSubfolders = true,
	}: SearchWorkflowsParams,
): Promise<SearchWorkflowsResult> {
	const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);
	const filterTags = tags && Array.from(new Set(tags.filter((tag) => tag.length > 0)));
	// Any folderId the caller sent is resolved, including an empty one: skipping
	// it would turn a malformed folder search into a search of everything.
	const folderFilter =
		folderId === undefined
			? {}
			: await resolveFolderFilter(folderFinderService, folderId, includeSubfolders);

	const options: ListQuery.Options = {
		take: safeLimit,
		sortBy,
		filter: {
			isArchived: false,
			...(query ? { query } : {}),
			...(projectId ? { projectId } : {}),
			...(filterTags && filterTags.length > 0 ? { tags: filterTags } : {}),
			...folderFilter,
		},
		select: {
			id: true,
			activeVersionId: true,
			name: true,
			description: true,
			createdAt: true,
			updatedAt: true,
			triggerCount: true,
			settings: true,
			parentFolder: true,
			tags: true,
		},
	};

	const { workflows, count } = await workflowService.getMany(
		user,
		options,
		false, // includeScopes
		false, // includeFolders
		false, // onlySharedWithMe
	);

	const formattedWorkflows: SearchWorkflowsItem[] = workflows.map((workflow) => {
		const {
			id,
			name,
			description,
			activeVersionId,
			createdAt,
			updatedAt,
			triggerCount,
			settings,
			parentFolder,
			tags: workflowTags,
		} = workflow as WorkflowEntity;

		return {
			id,
			name,
			description,
			active: activeVersionId !== null,
			createdAt: createdAt.toISOString(),
			updatedAt: updatedAt.toISOString(),
			triggerCount,
			availableInMCP: settings?.availableInMCP ?? false,
			parentFolderId: parentFolder?.id ?? null,
			tags: toTagSummary(workflowTags),
		};
	});

	return { data: formattedWorkflows, count };
}
