import { type User, type WorkflowEntity } from '@n8n/db';
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

import type { ListQuery } from '@/requests';
import type { FolderFinderService } from '@/services/folder-finder.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowService } from '@/workflows/workflow.service';
import { createLimitSchema, tagSchema, toTagSummary } from './schemas';

const MAX_RESULTS = 200;

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
	folderId: z
		.string()
		.optional()
		.describe(
			'Return only the workflows inside this folder. This is the ONLY correct way to answer "what is in folder X": folder membership is stored, not encoded in workflow names, so filtering by `query` on a folder name both misses members named differently and matches non-members that share the name. Resolve the name to an ID with search_folders first.',
		),
	recursive: z
		.boolean()
		.optional()
		.describe(
			'Whether a folder filter includes workflows in nested subfolders. Defaults to true, which is what naming a folder usually means. Set false to inspect one level.',
		),
	nodeTypes: z
		.array(z.string())
		.optional()
		.describe(
			'Keep only workflows containing at least one node of these types, e.g. ["n8n-nodes-base.slack"]. Use this for "which workflows use X" instead of fetching workflows and inspecting their nodes: it is answered from an index, so it costs one call however many workflows exist, and it matches the node actually used rather than the workflow name.',
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
					tags: z.array(tagSchema).describe('Tags assigned to the workflow'),
					folder: z
						.object({
							id: z.string().describe('The ID of the containing folder'),
							name: z.string().describe('The name of the containing folder'),
							path: z
								.array(z.string())
								.describe(
									"The folder's full name path from the project root. Same shape search_folders returns, so the two can be compared directly.",
								),
						})
						.nullable()
						.describe(
							'The folder this workflow is in, or null when it sits at the project root. Read folder membership from this field; never infer it from the workflow name.',
						),
				})
				.passthrough(),
		)
		.describe('List of workflows matching the query'),
	count: z.number().int().min(0).describe('Total number of workflows that match the filters'),
	error: z
		.string()
		.optional()
		.describe(
			'Set when a requested folderId could not be resolved. The results are then NOT scoped to that folder — do not present them as its contents, and do not retry with a name filter.',
		),
} satisfies z.ZodRawShape;

/**
 * 	Creates mcp tool definition for searching workflows with optional filters. Workflows can be filtered by name, project ID, and tags.
 * Returns a preview of each workflow including id, name, active status, creation and update timestamps, trigger count, and tags.
 */
export const createSearchWorkflowsTool = (
	user: User,
	workflowService: WorkflowService,
	telemetry: Telemetry,
	folderFinderService?: FolderFinderService,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'search_workflows',
		config: {
			description:
				'Search for workflows with optional filters. Returns a preview of each workflow.',
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
			recursive,
			nodeTypes,
		}: SearchWorkflowsParams) => {
			const parameters = { limit, query, projectId, tags, sortBy, folderId, recursive, nodeTypes };
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: 'search_workflows',
				parameters,
			};

			try {
				const payload: SearchWorkflowsResult = await searchWorkflows(
					user,
					workflowService,
					{
						limit,
						query,
						projectId,
						tags,
						sortBy,
						folderId,
						recursive,
						nodeTypes,
					},
					folderFinderService,
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
				throw error;
			}
		},
	};
};

export async function searchWorkflows(
	user: User,
	workflowService: WorkflowService,
	{
		limit = MAX_RESULTS,
		query,
		projectId,
		tags,
		sortBy = DEFAULT_SORT_BY,
		folderId,
		recursive = true,
		nodeTypes,
	}: SearchWorkflowsParams,
	folderFinderService?: FolderFinderService,
): Promise<SearchWorkflowsResult> {
	const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);
	const filterTags = tags && Array.from(new Set(tags.filter((tag) => tag.length > 0)));

	// A folder the caller cannot read has to abort the search, not silently widen
	// it: returning the unscoped set under a folder request is indistinguishable
	// from the folder being empty, and the caller would present it as its contents.
	let folderIds: string[] | undefined;
	if (folderId !== undefined) {
		if (!folderFinderService) {
			return {
				data: [],
				count: 0,
				error:
					'Folders are not available on this instance, so the results are NOT scoped to a folder. Ask the user which workflows they mean rather than matching on the folder name.',
			};
		}
		const folders = recursive
			? await folderFinderService.findFolderSubtreesForUser([folderId], user, ['folder:read'])
			: await folderFinderService.findFoldersByIdsForUser([folderId], user, ['folder:read']);
		if (!folders.some((folder) => folder.id === folderId)) {
			return {
				data: [],
				count: 0,
				error: `No folder with id "${folderId}" is readable here, so the results are NOT scoped to it. Use search_folders to find the right folder id. Do not fall back to a name filter: folder membership is not a name prefix.`,
			};
		}
		folderIds = folders.map((folder) => folder.id);
	}

	const options: ListQuery.Options = {
		take: safeLimit,
		sortBy,
		filter: {
			isArchived: false,
			...(query ? { query } : {}),
			...(projectId ? { projectId } : {}),
			...(filterTags && filterTags.length > 0 ? { tags: filterTags } : {}),
			// Expanded ids rather than a single `parentFolderId`: this listing path
			// matches that field exactly, and only the workflows-and-folders query
			// expands a folder into its subtree.
			...(folderIds ? { parentFolderIds: folderIds } : {}),
			// Resolved against the dependency index by the repository, so this matches
			// the node a workflow actually contains rather than its name.
			...(nodeTypes && nodeTypes.length > 0 ? { nodeTypes } : {}),
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
			tags: true,
			parentFolder: true,
		},
	};

	const { workflows, count } = await workflowService.getMany(
		user,
		options,
		false, // includeScopes
		false, // includeFolders
		false, // onlySharedWithMe
	);

	// One ancestor walk for every folder on this page, so each row can carry a name
	// path instead of a bare id the caller would have to resolve one lookup at a time.
	const pathsByFolderId = await readFolderPaths(
		[
			...new Set(
				workflows.flatMap((workflow) => (workflow as WorkflowEntity).parentFolder?.id ?? []),
			),
		],
		user,
		folderFinderService,
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
			tags: workflowTags,
			parentFolder,
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
			tags: toTagSummary(workflowTags),
			folder: parentFolder
				? {
						id: parentFolder.id,
						name: parentFolder.name,
						// A folder whose ancestors the caller cannot read still has a
						// usable answer: its own name.
						path: pathsByFolderId.get(parentFolder.id) ?? [parentFolder.name],
					}
				: null,
		};
	});

	return { data: formattedWorkflows, count };
}

/** Name paths from the project root, for exactly the folders this page landed in.
 *  Empty when nothing on the page is foldered, so an unfoldered listing costs
 *  nothing extra. */
async function readFolderPaths(
	folderIds: string[],
	user: User,
	folderFinderService?: FolderFinderService,
): Promise<Map<string, string[]>> {
	if (!folderFinderService || folderIds.length === 0) return new Map();

	const chains = await folderFinderService.findFolderAncestorChainsForUser(folderIds, user, [
		'folder:read',
	]);
	return new Map(
		[...chains.entries()].map(
			([id, chain]) => [id, chain.map((folder) => folder.name)] as const,
		),
	);
}
