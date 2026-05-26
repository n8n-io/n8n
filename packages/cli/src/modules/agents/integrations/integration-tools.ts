import { Tool, type InterruptibleToolContext, type ToolContext } from '@n8n/agents';
import { z } from 'zod';

import type { AgentCredentialIntegrationConfig } from '@n8n/api-types';
import { INTEGRATION_ERROR_CODES, type IntegrationErrorCode } from './integration-error-codes';

export type IntegrationMessageTarget =
	| {
			type: 'thread';
			threadId: string;
			channelId?: string;
			userId?: string;
	  }
	| {
			type: 'channel';
			channelId: string;
			threadId?: string;
	  }
	| {
			type: 'dm';
			userId: string;
			threadId?: string;
	  };

export interface IntegrationMessageContext {
	integrationConnectionId: string;
	platform: string;
	target: IntegrationMessageTarget;
	messageId?: string;
	interactingUserId?: string;
	agentUserId?: string;
	subject?: IntegrationMessageSubject;
	updatedAt: string;
}

export interface IntegrationMessageSubject {
	type: string;
	id: string;
	title?: string;
	description?: string;
	url?: string;
	status?: string;
	labels?: string[];
	assignee?: IntegrationSubjectPerson;
	author?: IntegrationSubjectPerson;
}

export interface IntegrationSubjectPerson {
	id: string;
	name: string;
}

export interface IntegrationToolConnectionDescriptor {
	agentId?: string;
	integration: AgentCredentialIntegrationConfig;
	integrationConnectionId: string;
	contextToolName: string;
	actionToolName: string;
	contextQueries: IntegrationContextQuery[];
	actions: IntegrationAction[];
}

export interface IntegrationMessageContextStore {
	getLatest(threadId: string): Promise<IntegrationMessageContext | null>;
	setLatest(
		threadId: string,
		resourceId: string,
		context: IntegrationMessageContext,
	): Promise<void>;
}

export interface IntegrationContextQueryExecutor {
	execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		query: IntegrationContextQuery;
		input: Record<string, unknown>;
		persistence?: { threadId: string; resourceId: string };
	}): Promise<unknown>;
}

export interface IntegrationActionExecutor {
	execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		action: IntegrationAction;
		input: Record<string, unknown>;
		awaitResponse: boolean;
		runId?: string;
		toolCallId?: string;
		currentMessageContext?: IntegrationMessageContext;
	}): Promise<IntegrationActionResult>;
}

export type IntegrationContextQuery =
	| 'get_current_message_context'
	| 'get_current_subject'
	| 'get_current_user'
	| 'get_current_channel_info'
	| 'get_user'
	| 'get_channel_info'
	| 'search_users'
	| 'search_channels'
	| 'get_team'
	| 'search_teams'
	| 'get_project'
	| 'search_projects'
	| 'search_labels'
	| 'search_issue_states'
	| 'get_issue'
	| 'search_issues';

export type IntegrationAction =
	| 'respond'
	| 'send_dm'
	| 'send_channel_message'
	| 'add_reaction'
	| 'create_issue'
	| 'update_issue'
	| 'create_comment';

export type IntegrationActionResult =
	| {
			ok: true;
			messageContext?: IntegrationMessageContext;
			[key: string]: unknown;
	  }
	| {
			ok: false;
			error: {
				code: IntegrationErrorCode;
				message: string;
			};
	  };

export const DEFAULT_INTEGRATION_CONTEXT_QUERIES: IntegrationContextQuery[] = [
	'get_current_message_context',
	'get_current_subject',
	'get_current_user',
	'get_current_channel_info',
	'get_user',
	'get_channel_info',
	'search_users',
	'search_channels',
];

export const DEFAULT_INTEGRATION_ACTIONS: IntegrationAction[] = [
	'respond',
	'send_dm',
	'send_channel_message',
];

const fieldPairSchema = z.object({
	label: z.string(),
	value: z.string(),
});

const selectOptionSchema = z.object({
	label: z.string(),
	value: z.string(),
	description: z.string().optional(),
});

const richComponentSchema = z.object({
	type: z.string(),
	text: z.string().optional(),
	label: z.string().optional(),
	value: z.string().optional(),
	style: z.enum(['primary', 'danger']).optional(),
	url: z.string().optional(),
	alt: z.string().optional(),
	altText: z.string().optional(),
	id: z.string().optional(),
	placeholder: z.string().optional(),
	options: z.array(selectOptionSchema).optional(),
	fields: z.array(fieldPairSchema).optional(),
});

const messageSchema = z.object({
	text: z.string().optional(),
	richInteraction: z
		.object({
			awaitResponse: z.boolean().optional(),
			title: z.string().optional(),
			message: z.string().optional(),
			components: z.array(richComponentSchema).min(1),
		})
		.optional(),
});

const noInputSchema = z.object({}).strict();

const platformUserIdSchema = z
	.string()
	.min(1)
	.describe(
		'Platform user ID, for example a Slack U... ID or Linear user UUID. Do not pass a name.',
	);

const platformChannelIdSchema = z
	.string()
	.min(1)
	.describe('Platform channel ID, for example a Slack C... channel ID. Do not pass a name.');

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

const getCurrentMessageContextInputSchema = z.object({
	query: z.literal('get_current_message_context'),
	input: noInputSchema,
});

const getCurrentSubjectInputSchema = z.object({
	query: z.literal('get_current_subject'),
	input: noInputSchema,
});

const getCurrentUserInputSchema = z.object({
	query: z.literal('get_current_user'),
	input: noInputSchema,
});

const getCurrentChannelInfoInputSchema = z.object({
	query: z.literal('get_current_channel_info'),
	input: noInputSchema,
});

const getUserInputSchema = z.object({
	query: z.literal('get_user'),
	input: z
		.object({
			userId: platformUserIdSchema,
		})
		.strict(),
});

const getChannelInfoInputSchema = z.object({
	query: z.literal('get_channel_info'),
	input: z
		.object({
			channelId: platformChannelIdSchema,
		})
		.strict(),
});

const searchUsersInputSchema = z.object({
	query: z.literal('search_users'),
	input: z
		.object({
			query: z
				.string()
				.min(1)
				.optional()
				.describe('User name, display name, handle, user ID, or email fragment to search for.'),
			email: z.string().min(1).optional().describe('Exact email address to look up when known.'),
			limit: searchLimitSchema,
			cursor: searchCursorSchema,
			includeBots: z
				.boolean()
				.optional()
				.describe('Whether to include bot users. Defaults to false.'),
			includeDeleted: z
				.boolean()
				.optional()
				.describe('Whether to include deleted/deactivated users. Defaults to false.'),
		})
		.strict()
		.refine((input) => input.query !== undefined || input.email !== undefined, {
			message: 'Provide query or email.',
		}),
});

const searchChannelsInputSchema = z.object({
	query: z.literal('search_channels'),
	input: z
		.object({
			query: z.string().min(1).describe('Channel name, channel ID, or #channel search term.'),
			limit: searchLimitSchema,
			cursor: searchCursorSchema,
			includeArchived: z
				.boolean()
				.optional()
				.describe('Whether to include archived channels. Defaults to false.'),
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

type IntegrationContextToolOperation =
	| z.infer<typeof getCurrentMessageContextInputSchema>
	| z.infer<typeof getCurrentSubjectInputSchema>
	| z.infer<typeof getCurrentUserInputSchema>
	| z.infer<typeof getCurrentChannelInfoInputSchema>
	| z.infer<typeof getUserInputSchema>
	| z.infer<typeof getChannelInfoInputSchema>
	| z.infer<typeof searchUsersInputSchema>
	| z.infer<typeof searchChannelsInputSchema>
	| z.infer<typeof getTeamInputSchema>
	| z.infer<typeof searchTeamsInputSchema>
	| z.infer<typeof getProjectInputSchema>
	| z.infer<typeof searchProjectsInputSchema>
	| z.infer<typeof searchLabelsInputSchema>
	| z.infer<typeof searchIssueStatesInputSchema>
	| z.infer<typeof getIssueInputSchema>
	| z.infer<typeof searchIssuesInputSchema>;

const CONTEXT_QUERY_INPUT_SCHEMAS: Record<
	IntegrationContextQuery,
	z.ZodType<IntegrationContextToolOperation>
> = {
	get_current_message_context: getCurrentMessageContextInputSchema,
	get_current_subject: getCurrentSubjectInputSchema,
	get_current_user: getCurrentUserInputSchema,
	get_current_channel_info: getCurrentChannelInfoInputSchema,
	get_user: getUserInputSchema,
	get_channel_info: getChannelInfoInputSchema,
	search_users: searchUsersInputSchema,
	search_channels: searchChannelsInputSchema,
	get_team: getTeamInputSchema,
	search_teams: searchTeamsInputSchema,
	get_project: getProjectInputSchema,
	search_projects: searchProjectsInputSchema,
	search_labels: searchLabelsInputSchema,
	search_issue_states: searchIssueStatesInputSchema,
	get_issue: getIssueInputSchema,
	search_issues: searchIssuesInputSchema,
} satisfies Record<IntegrationContextQuery, z.ZodType<IntegrationContextToolOperation>>;

interface RawContextToolOperation {
	query: IntegrationContextQuery;
	input: Record<string, unknown>;
}

type RawContextToolInput = {
	query?: IntegrationContextQuery;
	input?: Record<string, unknown>;
	queries?: RawContextToolOperation[];
};

const MAX_BATCH_OPERATIONS = 20;

function buildContextInputSchema(queries: IntegrationContextQuery[]) {
	const querySchema = z.enum(toZodEnumValues(queries));
	const operationSchema = z
		.object({
			query: querySchema,
			input: z.record(z.string(), z.unknown()),
		})
		.strict();

	return z
		.object({
			query: querySchema.optional(),
			input: z.record(z.string(), z.unknown()).optional(),
			queries: z.array(operationSchema).min(1).max(MAX_BATCH_OPERATIONS).optional(),
		})
		.strict()
		.superRefine((input, ctx) => {
			if (input.queries !== undefined) {
				if (input.query !== undefined || input.input !== undefined) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Provide either query/input or queries, not both.',
					});
				}
				input.queries.forEach((operation, index) => {
					validateContextOperationSchema(operation, ctx, ['queries', index]);
				});
				return;
			}

			if (input.query === undefined || input.input === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Provide query and input, or provide queries for a batch.',
				});
				return;
			}

			validateContextOperationSchema({ query: input.query, input: input.input }, ctx);
		});
}

const respondActionInputSchema = z.object({
	action: z.literal('respond'),
	input: z
		.object({
			message: messageSchema,
		})
		.strict(),
});

const sendDmActionInputSchema = z.object({
	action: z.literal('send_dm'),
	input: z
		.object({
			userId: platformUserIdSchema,
			message: messageSchema,
		})
		.strict(),
});

const sendChannelMessageActionInputSchema = z.object({
	action: z.literal('send_channel_message'),
	input: z
		.object({
			channelId: platformChannelIdSchema,
			message: messageSchema,
		})
		.strict(),
});

const addReactionActionInputSchema = z.object({
	action: z.literal('add_reaction'),
	input: z
		.object({
			emoji: z
				.string()
				.min(1)
				.describe('Emoji name or shortcode to add, for example eyes or :white_check_mark:.'),
			threadId: z
				.string()
				.min(1)
				.optional()
				.describe('Optional Slack thread ID. Defaults to the latest message context.'),
			messageId: z
				.string()
				.min(1)
				.optional()
				.describe('Optional Slack message timestamp. Defaults to the latest message context.'),
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

type IntegrationActionToolOperation =
	| z.infer<typeof respondActionInputSchema>
	| z.infer<typeof sendDmActionInputSchema>
	| z.infer<typeof sendChannelMessageActionInputSchema>
	| z.infer<typeof addReactionActionInputSchema>
	| z.infer<typeof createIssueActionInputSchema>
	| z.infer<typeof updateIssueActionInputSchema>
	| z.infer<typeof createCommentActionInputSchema>;

const ACTION_INPUT_SCHEMAS: Record<IntegrationAction, z.ZodType<IntegrationActionToolOperation>> = {
	respond: respondActionInputSchema,
	send_dm: sendDmActionInputSchema,
	send_channel_message: sendChannelMessageActionInputSchema,
	add_reaction: addReactionActionInputSchema,
	create_issue: createIssueActionInputSchema,
	update_issue: updateIssueActionInputSchema,
	create_comment: createCommentActionInputSchema,
};

interface RawActionToolOperation {
	action: IntegrationAction;
	input: Record<string, unknown>;
}

type RawActionToolInput = {
	action?: IntegrationAction;
	input?: Record<string, unknown>;
	actions?: RawActionToolOperation[];
};

function buildActionInputSchema(actions: IntegrationAction[]) {
	const actionSchema = z.enum(toZodEnumValues(actions));
	const operationSchema = z
		.object({
			action: actionSchema,
			input: z.record(z.string(), z.unknown()),
		})
		.strict();

	return z
		.object({
			action: actionSchema.optional(),
			input: z.record(z.string(), z.unknown()).optional(),
			actions: z.array(operationSchema).min(1).max(MAX_BATCH_OPERATIONS).optional(),
		})
		.strict()
		.superRefine((input, ctx) => {
			if (input.actions !== undefined) {
				if (input.action !== undefined || input.input !== undefined) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Provide either action/input or actions, not both.',
					});
				}
				input.actions.forEach((operation, index) => {
					validateActionOperationSchema(operation, ctx, ['actions', index]);
				});
				return;
			}

			if (input.action === undefined || input.input === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Provide action and input, or provide actions for a batch.',
				});
				return;
			}

			validateActionOperationSchema({ action: input.action, input: input.input }, ctx);
		});
}

const CONTEXT_QUERY_DESCRIPTIONS = {
	get_current_message_context:
		'get_current_message_context: no input. Returns the latest place this agent communicated in this thread. For Slack, context.agentUserId is the bot user ID for this agent; do not look it up as another user.',
	get_current_subject:
		'get_current_subject: no input. Returns the subject of the latest message context, such as a Linear issue, when available.',
	get_current_user:
		'get_current_user: no input. Returns the latest user who interacted in the current message context.',
	get_current_channel_info:
		'get_current_channel_info: no input. Returns metadata for the latest channel in the current message context.',
	get_user:
		'get_user: input.userId is required. Use a platform user ID such as a Slack U... ID or Linear user UUID, not a name, handle, or email.',
	get_channel_info:
		'get_channel_info: input.channelId is required. Use a platform channel ID such as a Slack C... ID, not a channel name.',
	search_users:
		'search_users: input.query or input.email is required. Returns matching platform user IDs for names, handles, or emails. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	search_channels:
		'search_channels: input.query is required. Returns matching platform channel IDs for channel names or IDs. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	get_team:
		'get_team: input.teamId is required. For Linear, returns team metadata including the team UUID/key/name.',
	search_teams:
		'search_teams: optional input.query. For Linear, returns team UUIDs/keys/names. Omit query to list teams. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	get_project: 'get_project: input.projectId is required. For Linear, returns project metadata.',
	search_projects:
		'search_projects: optional input.query. For Linear, returns project IDs/names; optional input.teamId scopes results to a team. Omit query to list projects. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	search_labels:
		'search_labels: optional input.query. For Linear, returns label IDs/names; optional input.teamId scopes results to a team. Omit query to list labels. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	search_issue_states:
		'search_issue_states: optional input.query. For Linear, returns workflow state IDs/names/types; optional input.teamId and input.type narrow results. Omit query to list states. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	get_issue:
		'get_issue: input.issueId is required. For Linear, use an issue UUID or identifier such as ENG-123. Optional input.includeComments and input.commentsLimit add recent comments.',
	search_issues:
		'search_issues: input.query is required. For Linear, returns matching issue IDs/identifiers; optional input.teamId, input.limit, and input.includeArchived narrow results. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
} satisfies Record<IntegrationContextQuery, string>;

const ACTION_DESCRIPTIONS = {
	respond:
		'respond: input.message is required. Responds in the latest message context for this integration connection.',
	send_dm:
		'send_dm: input.userId and input.message are required. userId must be a platform user ID, not a name, handle, or email.',
	send_channel_message:
		'send_channel_message: input.channelId and input.message are required. channelId must be a platform channel ID, not a channel name.',
	add_reaction:
		'add_reaction: input.emoji is required. For Slack, optional input.threadId and input.messageId target a specific message; otherwise the latest message context is used.',
	create_issue:
		'create_issue: input.teamId and input.title are required. For Linear, optional input.description, input.assigneeId, input.projectId, input.labelIds, input.priority, input.stateId, and input.parentId configure the issue.',
	update_issue:
		'update_issue: input.issueId and at least one field are required. For Linear, optional input.title, input.description, input.teamId, input.assigneeId, input.projectId, input.labelIds, input.priority, input.stateId, and input.parentId update the issue. Some fields accept null to clear them.',
	create_comment:
		'create_comment: input.issueId and input.body are required. For Linear, optional input.parentCommentId creates a threaded reply.',
} satisfies Record<IntegrationAction, string>;

// Suspend payload accepts any action name so platforms can contribute their own
// verbs (Linear `create_issue`, GitHub `create_pull_request`, …) without
// widening a central enum every time.
const actionSuspendSchema = z.object({
	type: z.literal('integration_action'),
	action: z.string(),
	integrationConnectionId: z.string(),
	messageContext: z.unknown(),
});

const actionResumeSchema = z.record(z.string(), z.unknown());

export function getIntegrationToolConnectionDescriptors(
	integrations: AgentCredentialIntegrationConfig[],
	agentId?: string,
	capabilitiesFor?: (integration: AgentCredentialIntegrationConfig) => {
		contextQueries?: IntegrationContextQuery[];
		actions?: IntegrationAction[];
	},
): IntegrationToolConnectionDescriptor[] {
	const sorted = [...integrations].sort((a, b) => {
		const byType = a.type.localeCompare(b.type);
		if (byType !== 0) return byType;
		return a.credentialId.localeCompare(b.credentialId);
	});

	const seenByType = new Map<string, number>();

	return sorted.map((integration) => {
		const seenCount = seenByType.get(integration.type) ?? 0;
		const nextCount = seenCount + 1;
		seenByType.set(integration.type, nextCount);
		const suffix = nextCount === 1 ? '' : `_${nextCount}`;
		const baseName = `${integration.type}${suffix}`;
		const capabilities = capabilitiesFor?.(integration);

		return {
			agentId,
			integration,
			integrationConnectionId: buildIntegrationConnectionId(integration),
			contextToolName: `${baseName}_context`,
			actionToolName: `${baseName}_action`,
			contextQueries: capabilities?.contextQueries ?? DEFAULT_INTEGRATION_CONTEXT_QUERIES,
			actions: capabilities?.actions ?? DEFAULT_INTEGRATION_ACTIONS,
		};
	});
}

export function buildIntegrationConnectionId(
	integration: Pick<AgentCredentialIntegrationConfig, 'type' | 'credentialId'>,
): string {
	return `${integration.type}:${integration.credentialId}`;
}

export function createIntegrationContextTool(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	queryExecutor: IntegrationContextQueryExecutor;
}) {
	const { descriptor, messageContextStore, queryExecutor } = params;

	return new Tool(descriptor.contextToolName)
		.description(buildContextToolDescription(descriptor))
		.input(buildContextInputSchema(descriptor.contextQueries))
		.handler(async (input, ctx) => {
			const toolInput = input as RawContextToolInput;
			if (toolInput.queries !== undefined) {
				const results = await Promise.all(
					toolInput.queries.map(async (operation) => ({
						query: operation.query,
						result: await executeContextToolOperation({
							operation,
							descriptor,
							messageContextStore,
							queryExecutor,
							persistence: ctx.persistence,
						}),
					})),
				);

				return { ok: true, results };
			}

			return await executeContextToolOperation({
				operation: toSingleContextOperation(toolInput),
				descriptor,
				messageContextStore,
				queryExecutor,
				persistence: ctx.persistence,
			});
		});
}

export function createIntegrationActionTool(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	actionExecutor: IntegrationActionExecutor;
}) {
	const { descriptor, messageContextStore, actionExecutor } = params;

	return new Tool(descriptor.actionToolName)
		.description(buildActionToolDescription(descriptor))
		.input(buildActionInputSchema(descriptor.actions))
		.suspend(actionSuspendSchema)
		.resume(actionResumeSchema)
		.handler(async (input, ctx) => {
			if (ctx.resumeData) {
				return ctx.resumeData;
			}

			const interruptCtx = ctx as InterruptibleToolContext;
			const toolInput = input as RawActionToolInput;

			if (toolInput.actions !== undefined) {
				return await executeActionToolBatch({
					operations: toolInput.actions,
					descriptor,
					messageContextStore,
					actionExecutor,
					ctx,
				});
			}

			return await executeActionToolOperation({
				operation: toSingleActionOperation(toolInput),
				descriptor,
				messageContextStore,
				actionExecutor,
				ctx,
				interruptCtx,
				allowSuspend: true,
			});
		});
}

function buildContextToolDescription(descriptor: IntegrationToolConnectionDescriptor): string {
	return [
		`Read context from the ${descriptor.integration.type} integration connection.`,
		`Available queries: ${descriptor.contextQueries.join(', ')}.`,
		'Query inputs:',
		...descriptor.contextQueries.map((query) => `- ${CONTEXT_QUERY_DESCRIPTIONS[query]}`),
		`Batch form: pass queries as an array of up to ${MAX_BATCH_OPERATIONS} { query, input } objects to fetch multiple pieces of context in one tool call.`,
		'Use this tool for read-only lookup before choosing an action target.',
	].join('\n\n');
}

function buildActionToolDescription(descriptor: IntegrationToolConnectionDescriptor): string {
	return [
		`Take actions in the ${descriptor.integration.type} integration connection.`,
		`Available actions: ${descriptor.actions.join(', ')}.`,
		'Action inputs:',
		...descriptor.actions.map((action) => `- ${ACTION_DESCRIPTIONS[action]}`),
		`Batch form: pass actions as an array of up to ${MAX_BATCH_OPERATIONS} { action, input } objects. Batch actions run sequentially and cannot include rich interactions that wait for a user response.`,
		'respond uses the latest message context for this integration connection.',
		'Messages may include richInteraction components. Interactive components suspend the agent until the user responds.',
	].join('\n\n');
}

function toSingleContextOperation(input: RawContextToolInput): RawContextToolOperation {
	if (input.query === undefined || input.input === undefined) {
		throw new Error('Integration context tool input was not validated.');
	}
	return { query: input.query, input: input.input };
}

function toSingleActionOperation(input: RawActionToolInput): RawActionToolOperation {
	if (input.action === undefined || input.input === undefined) {
		throw new Error('Integration action tool input was not validated.');
	}
	return { action: input.action, input: input.input };
}

function hasUpdateIssueField(input: {
	issueId: string;
	teamId?: string | null;
	title?: string;
	description?: string | null;
	assigneeId?: string | null;
	projectId?: string | null;
	labelIds?: string[];
	priority?: number | null;
	stateId?: string | null;
	parentId?: string | null;
}): boolean {
	return (
		input.teamId !== undefined ||
		input.title !== undefined ||
		input.description !== undefined ||
		input.assigneeId !== undefined ||
		input.projectId !== undefined ||
		input.labelIds !== undefined ||
		input.priority !== undefined ||
		input.stateId !== undefined ||
		input.parentId !== undefined
	);
}

function validateContextOperationSchema(
	operation: RawContextToolOperation,
	ctx: z.RefinementCtx,
	pathPrefix: Array<string | number> = [],
): void {
	const operationSchema = CONTEXT_QUERY_INPUT_SCHEMAS[operation.query];
	const result = operationSchema.safeParse(operation);
	if (!result.success) addSchemaIssues(ctx, result.error, pathPrefix);
}

function validateActionOperationSchema(
	operation: RawActionToolOperation,
	ctx: z.RefinementCtx,
	pathPrefix: Array<string | number> = [],
): void {
	const operationSchema = ACTION_INPUT_SCHEMAS[operation.action];
	const result = operationSchema.safeParse(operation);
	if (!result.success) addSchemaIssues(ctx, result.error, pathPrefix);
}

async function executeContextToolOperation(params: {
	operation: RawContextToolOperation;
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	queryExecutor: IntegrationContextQueryExecutor;
	persistence: ToolContext['persistence'];
}): Promise<unknown> {
	const { operation, descriptor, messageContextStore, queryExecutor, persistence } = params;

	if (isCurrentContextQuery(operation.query)) {
		if (!persistence) {
			return {
				ok: false,
				error: {
					code: INTEGRATION_ERROR_CODES.NO_THREAD_CONTEXT,
					message: 'There is no current agent thread context.',
				},
			};
		}
		const context = await messageContextStore.getLatest(persistence.threadId);
		if (!context || context.integrationConnectionId !== descriptor.integrationConnectionId) {
			if (operation.query === 'get_current_message_context') {
				return { ok: true, context: null };
			}
			if (operation.query === 'get_current_subject') {
				return { ok: true, subject: null };
			}
			return {
				ok: false,
				error: {
					code: INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
					message: 'There is no current message context for this integration connection.',
				},
			};
		}
		if (operation.query === 'get_current_message_context') {
			return { ok: true, context };
		}
		if (operation.query === 'get_current_subject') {
			return { ok: true, subject: context.subject ?? null };
		}
		if (operation.query === 'get_current_user') {
			if (!context.interactingUserId) {
				return {
					ok: false,
					error: {
						code: INTEGRATION_ERROR_CODES.NO_INTERACTING_USER_CONTEXT,
						message: 'The latest message context does not include an interacting user ID.',
					},
				};
			}
			return await queryExecutor.execute({
				descriptor,
				query: 'get_user',
				input: { userId: context.interactingUserId },
				persistence,
			});
		}

		const channelId = getTargetChannelId(context.target);
		if (!channelId) {
			return {
				ok: false,
				error: {
					code: INTEGRATION_ERROR_CODES.NO_CHANNEL_CONTEXT,
					message: 'The latest message context does not include a channel ID.',
				},
			};
		}
		return await queryExecutor.execute({
			descriptor,
			query: 'get_channel_info',
			input: { channelId },
			persistence,
		});
	}

	return await queryExecutor.execute({
		descriptor,
		query: operation.query,
		input: operation.input,
		persistence,
	});
}

function isCurrentContextQuery(query: IntegrationContextQuery): boolean {
	return (
		query === 'get_current_message_context' ||
		query === 'get_current_subject' ||
		query === 'get_current_user' ||
		query === 'get_current_channel_info'
	);
}

async function executeActionToolBatch(params: {
	operations: RawActionToolOperation[];
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	actionExecutor: IntegrationActionExecutor;
	ctx: ToolContext;
}): Promise<unknown> {
	const { operations, descriptor, messageContextStore, actionExecutor, ctx } = params;
	let currentMessageContext =
		ctx.persistence !== undefined
			? await getOptionalCurrentContext({
					descriptor,
					messageContextStore,
					threadId: ctx.persistence.threadId,
				})
			: undefined;

	const results: Array<{ action: IntegrationAction; result: unknown }> = [];
	for (const operation of operations) {
		const result = await executeActionToolOperation({
			operation,
			descriptor,
			messageContextStore,
			actionExecutor,
			ctx,
			currentMessageContext,
			allowSuspend: false,
		});

		const nextMessageContext = extractSuccessfulMessageContext(result);
		if (nextMessageContext) currentMessageContext = nextMessageContext;

		results.push({ action: operation.action, result });
	}

	return { ok: true, results };
}

async function executeActionToolOperation(params: {
	operation: RawActionToolOperation;
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	actionExecutor: IntegrationActionExecutor;
	ctx: ToolContext;
	interruptCtx?: InterruptibleToolContext;
	currentMessageContext?: IntegrationMessageContext;
	allowSuspend: boolean;
}): Promise<unknown> {
	const {
		operation,
		descriptor,
		messageContextStore,
		actionExecutor,
		ctx,
		interruptCtx,
		allowSuspend,
	} = params;
	const persistence = ctx.persistence;
	const actionInput = operation.input;
	const message = parseMessage(actionInput.message);
	const awaitsResponse = shouldAwaitResponse(message);

	if (awaitsResponse && !allowSuspend) {
		return {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.ACTION_FAILED,
				message:
					'Batch actions cannot include rich interactions that wait for a user response. Send that action separately.',
			},
		};
	}

	let currentMessageContext = params.currentMessageContext;
	if (operation.action === 'respond') {
		if (!currentMessageContext) {
			const contextResult = await getRespondContext({
				descriptor,
				messageContextStore,
				persistence,
			});
			if (!contextResult.ok) {
				return contextResult;
			}
			currentMessageContext = contextResult.context;
		}
	} else if (!currentMessageContext && persistence) {
		currentMessageContext = await getOptionalCurrentContext({
			descriptor,
			messageContextStore,
			threadId: persistence.threadId,
		});
	}

	const result = await actionExecutor.execute({
		descriptor,
		action: operation.action,
		input: actionInput,
		awaitResponse: awaitsResponse,
		runId: ctx.runId,
		toolCallId: ctx.toolCallId,
		currentMessageContext,
	});

	if (!result.ok) return result;

	let actionResult = result;
	if (result.messageContext && persistence) {
		const messageContext = withPreviousSubject(result.messageContext, currentMessageContext);
		await messageContextStore.setLatest(
			persistence.threadId,
			persistence.resourceId,
			messageContext,
		);
		actionResult = { ...result, messageContext };
	}

	if (!awaitsResponse) return actionResult;

	return await interruptCtx?.suspend({
		type: 'integration_action',
		action: operation.action,
		integrationConnectionId: descriptor.integrationConnectionId,
		messageContext: actionResult.messageContext,
	});
}

function addSchemaIssues(
	ctx: z.RefinementCtx,
	error: z.ZodError,
	pathPrefix: Array<string | number> = [],
): void {
	for (const issue of error.issues) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: [...pathPrefix, ...issue.path],
			message: issue.message,
		});
	}
}

function toZodEnumValues<T extends string>(values: T[]): [T, ...T[]] {
	if (values.length === 0) {
		throw new Error('Integration tools require at least one operation.');
	}
	return values as [T, ...T[]];
}

function parseMessage(value: unknown): z.infer<typeof messageSchema> | undefined {
	const result = messageSchema.safeParse(value);
	return result.success ? result.data : undefined;
}

function shouldAwaitResponse(message: z.infer<typeof messageSchema> | undefined): boolean {
	const richInteraction = message?.richInteraction;
	if (!richInteraction) return false;
	if (richInteraction.awaitResponse === true) return true;
	return richInteraction.components.some((component) =>
		['button', 'select', 'radio_select'].includes(component.type),
	);
}

function withPreviousSubject(
	context: IntegrationMessageContext,
	previousContext: IntegrationMessageContext | undefined,
): IntegrationMessageContext {
	if (!previousContext) return context;
	if (context.integrationConnectionId !== previousContext.integrationConnectionId) return context;
	return {
		...context,
		...(!context.subject && previousContext.subject ? { subject: previousContext.subject } : {}),
		...(!context.agentUserId && previousContext.agentUserId
			? { agentUserId: previousContext.agentUserId }
			: {}),
	};
}

function extractSuccessfulMessageContext(result: unknown): IntegrationMessageContext | undefined {
	if (!isPlainRecord(result) || result.ok !== true) return undefined;
	const messageContext = result.messageContext;
	return isIntegrationMessageContext(messageContext) ? messageContext : undefined;
}

function isIntegrationMessageContext(value: unknown): value is IntegrationMessageContext {
	return (
		isPlainRecord(value) &&
		typeof value.integrationConnectionId === 'string' &&
		typeof value.platform === 'string' &&
		isPlainRecord(value.target) &&
		(value.agentUserId === undefined || typeof value.agentUserId === 'string') &&
		typeof value.updatedAt === 'string'
	);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getOptionalCurrentContext(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	threadId: string;
}): Promise<IntegrationMessageContext | undefined> {
	try {
		const context = await params.messageContextStore.getLatest(params.threadId);
		if (context?.integrationConnectionId !== params.descriptor.integrationConnectionId) {
			return undefined;
		}
		return context;
	} catch {
		return undefined;
	}
}

async function getRespondContext(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	persistence: ToolContext['persistence'];
}): Promise<
	| { ok: true; context: IntegrationMessageContext }
	| { ok: false; error: { code: string; message: string } }
> {
	const { descriptor, messageContextStore, persistence } = params;
	if (!persistence) {
		return {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
				message: 'There is no current message context. Use an explicit send action.',
			},
		};
	}

	const context = await messageContextStore.getLatest(persistence.threadId);
	if (!context) {
		return {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
				message: 'There is no current message context. Use an explicit send action.',
			},
		};
	}

	if (context.integrationConnectionId !== descriptor.integrationConnectionId) {
		return {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT_FOR_INTEGRATION,
				message: 'The latest message context belongs to another integration connection.',
			},
		};
	}

	return { ok: true, context };
}

function getTargetChannelId(target: IntegrationMessageTarget): string | undefined {
	if (target.type === 'thread' || target.type === 'channel') {
		return target.channelId;
	}
	return undefined;
}
