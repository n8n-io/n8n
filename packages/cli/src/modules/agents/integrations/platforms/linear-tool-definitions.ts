import { z } from 'zod';

import { hasUpdateIssueField } from '../integration-helpers';
import type {
	IntegrationActionDefinition,
	IntegrationContextQueryDefinition,
} from '../integration-tool-types';

const searchLimitSchema = z
	.number()
	.int()
	.min(1)
	.max(50)
	.optional()
	.describe('Maximum number of matches to return. Defaults to 10.');

const searchCursorSchema = z
	.string()
	.min(1)
	.optional()
	.describe(
		'Opaque pagination cursor returned as `nextCursor` by a previous call. Pass to fetch the next page of matches.',
	);

const linearTeamIdSchema = z
	.string()
	.min(1)
	.describe('Linear team UUID returned by get_team or search_teams.');

const linearProjectIdSchema = z
	.string()
	.min(1)
	.describe('Linear project UUID returned by get_project or search_projects.');

const optionalLinearSearchQuerySchema = z
	.string()
	.min(1)
	.optional()
	.describe('Optional search term. Omit to list the first page.');

const getTeamInputSchema = z.object({
	query: z.literal('get_team'),
	input: z
		.object({
			teamId: linearTeamIdSchema,
		})
		.strict(),
});

const searchTeamsInputSchema = z.object({
	query: z.literal('search_teams'),
	input: z
		.object({
			query: optionalLinearSearchQuerySchema,
			limit: searchLimitSchema,
			cursor: searchCursorSchema,
			includeArchived: z
				.boolean()
				.optional()
				.describe('Whether to include archived teams. Defaults to false.'),
		})
		.strict(),
});

const getProjectInputSchema = z.object({
	query: z.literal('get_project'),
	input: z
		.object({
			projectId: linearProjectIdSchema,
		})
		.strict(),
});

const searchProjectsInputSchema = z.object({
	query: z.literal('search_projects'),
	input: z
		.object({
			query: optionalLinearSearchQuerySchema,
			limit: searchLimitSchema,
			cursor: searchCursorSchema,
			teamId: linearTeamIdSchema.optional().describe('Optional Linear team UUID to scope search.'),
			includeArchived: z
				.boolean()
				.optional()
				.describe('Whether to include archived projects. Defaults to false.'),
		})
		.strict(),
});

const searchLabelsInputSchema = z.object({
	query: z.literal('search_labels'),
	input: z
		.object({
			query: optionalLinearSearchQuerySchema,
			limit: searchLimitSchema,
			cursor: searchCursorSchema,
			teamId: linearTeamIdSchema.optional().describe('Optional Linear team UUID to scope search.'),
		})
		.strict(),
});

const searchIssueStatesInputSchema = z.object({
	query: z.literal('search_issue_states'),
	input: z
		.object({
			query: optionalLinearSearchQuerySchema,
			limit: searchLimitSchema,
			cursor: searchCursorSchema,
			teamId: linearTeamIdSchema.optional().describe('Optional Linear team UUID to scope search.'),
			type: z
				.enum(['backlog', 'unstarted', 'started', 'completed', 'canceled'])
				.optional()
				.describe('Optional Linear workflow state type to filter by.'),
		})
		.strict(),
});

const getIssueInputSchema = z.object({
	query: z.literal('get_issue'),
	input: z
		.object({
			issueId: z.string().min(1).describe('Linear issue UUID or identifier such as ENG-123.'),
			includeComments: z
				.boolean()
				.optional()
				.describe('Whether to include recent comments. Defaults to false.'),
			commentsLimit: z
				.number()
				.int()
				.min(1)
				.max(20)
				.optional()
				.describe('Maximum number of recent comments to return. Defaults to 10.'),
		})
		.strict(),
});

const searchIssuesInputSchema = z.object({
	query: z.literal('search_issues'),
	input: z
		.object({
			query: z.string().min(1).describe('Search term for Linear issue title/content.'),
			limit: searchLimitSchema,
			cursor: searchCursorSchema,
			teamId: z.string().min(1).optional().describe('Optional Linear team ID to scope search.'),
			includeArchived: z
				.boolean()
				.optional()
				.describe('Whether to include archived issues. Defaults to false.'),
		})
		.strict(),
});

const createIssueActionInputSchema = z.object({
	action: z.literal('create_issue'),
	input: z
		.object({
			teamId: z
				.string()
				.min(1)
				.describe('Linear team UUID where the issue should be created. Use search_teams first.'),
			title: z.string().min(1).describe('Linear issue title.'),
			description: z.string().min(1).optional().describe('Optional Linear issue description.'),
			assigneeId: z.string().min(1).optional().describe('Optional Linear assignee user ID.'),
			projectId: z.string().min(1).optional().describe('Optional Linear project ID.'),
			labelIds: z.array(z.string().min(1)).optional().describe('Optional Linear label IDs.'),
			priority: z.number().int().optional().describe('Optional Linear priority value.'),
			stateId: z.string().min(1).optional().describe('Optional Linear workflow state ID.'),
			parentId: z.string().min(1).optional().describe('Optional parent Linear issue ID.'),
		})
		.strict(),
});

const nullableLinearIdSchema = z.string().min(1).nullable();

const updateIssueActionInputSchema = z.object({
	action: z.literal('update_issue'),
	input: z
		.object({
			issueId: z.string().min(1).describe('Linear issue UUID to update.'),
			teamId: nullableLinearIdSchema
				.optional()
				.describe('Optional Linear team UUID. Pass null to clear when Linear allows it.'),
			title: z.string().min(1).optional().describe('Optional updated Linear issue title.'),
			description: z
				.string()
				.min(1)
				.nullable()
				.optional()
				.describe('Optional updated Linear issue description. Pass null to clear.'),
			assigneeId: nullableLinearIdSchema
				.optional()
				.describe('Optional Linear assignee user ID. Pass null to unassign.'),
			projectId: nullableLinearIdSchema
				.optional()
				.describe('Optional Linear project ID. Pass null to remove the project.'),
			labelIds: z
				.array(z.string().min(1))
				.optional()
				.describe('Optional complete set of Linear label IDs. Pass [] to clear labels.'),
			priority: z
				.number()
				.int()
				.nullable()
				.optional()
				.describe('Optional Linear priority value. Pass null to clear.'),
			stateId: nullableLinearIdSchema.optional().describe('Optional Linear workflow state ID.'),
			parentId: nullableLinearIdSchema
				.optional()
				.describe('Optional parent Linear issue ID. Pass null to clear.'),
		})
		.strict()
		.refine(hasUpdateIssueField, {
			message: 'Provide at least one issue field to update.',
		}),
});

const createCommentActionInputSchema = z.object({
	action: z.literal('create_comment'),
	input: z
		.object({
			issueId: z.string().min(1).describe('Linear issue UUID where the comment should be added.'),
			body: z.string().min(1).describe('Linear comment body.'),
			parentCommentId: z
				.string()
				.min(1)
				.optional()
				.describe('Optional parent Linear comment ID for threaded replies.'),
		})
		.strict(),
});

export const LINEAR_CONTEXT_QUERY_TOOL_DEFINITIONS = [
	{
		name: 'get_team',
		inputSchema: getTeamInputSchema,
		description:
			'get_team: input.teamId is required. For Linear, returns team metadata including the team UUID/key/name.',
	},
	{
		name: 'search_teams',
		inputSchema: searchTeamsInputSchema,
		description:
			'search_teams: optional input.query. For Linear, returns team UUIDs/keys/names. Omit query to list teams. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	},
	{
		name: 'get_project',
		inputSchema: getProjectInputSchema,
		description: 'get_project: input.projectId is required. For Linear, returns project metadata.',
	},
	{
		name: 'search_projects',
		inputSchema: searchProjectsInputSchema,
		description:
			'search_projects: optional input.query. For Linear, returns project IDs/names; optional input.teamId scopes results to a team. Omit query to list projects. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	},
	{
		name: 'search_labels',
		inputSchema: searchLabelsInputSchema,
		description:
			'search_labels: optional input.query. For Linear, returns label IDs/names; optional input.teamId scopes results to a team. Omit query to list labels. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	},
	{
		name: 'search_issue_states',
		inputSchema: searchIssueStatesInputSchema,
		description:
			'search_issue_states: optional input.query. For Linear, returns workflow state IDs/names/types; optional input.teamId and input.type narrow results. Omit query to list states. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	},
	{
		name: 'get_issue',
		inputSchema: getIssueInputSchema,
		description:
			'get_issue: input.issueId is required. For Linear, use an issue UUID or identifier such as ENG-123. Optional input.includeComments and input.commentsLimit add recent comments.',
	},
	{
		name: 'search_issues',
		inputSchema: searchIssuesInputSchema,
		description:
			'search_issues: input.query is required. For Linear, returns matching issue IDs/identifiers; optional input.teamId, input.limit, and input.includeArchived narrow results. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	},
] satisfies IntegrationContextQueryDefinition[];

export const LINEAR_ACTION_TOOL_DEFINITIONS = [
	{
		name: 'create_issue',
		inputSchema: createIssueActionInputSchema,
		description:
			'create_issue: input.teamId and input.title are required. For Linear, optional input.description, input.assigneeId, input.projectId, input.labelIds, input.priority, input.stateId, and input.parentId configure the issue.',
	},
	{
		name: 'update_issue',
		inputSchema: updateIssueActionInputSchema,
		description:
			'update_issue: input.issueId and at least one field are required. For Linear, optional input.title, input.description, input.teamId, input.assigneeId, input.projectId, input.labelIds, input.priority, input.stateId, and input.parentId update the issue. Some fields accept null to clear them.',
	},
	{
		name: 'create_comment',
		inputSchema: createCommentActionInputSchema,
		description:
			'create_comment: input.issueId and input.body are required. For Linear, optional input.parentCommentId creates a threaded reply.',
	},
] satisfies IntegrationActionDefinition[];
