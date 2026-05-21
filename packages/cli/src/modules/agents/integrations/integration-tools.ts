import { Tool, type InterruptibleToolContext, type ToolContext } from '@n8n/agents';
import { z } from 'zod';

import type { AgentCredentialIntegrationConfig } from '@n8n/api-types';

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
	| 'get_issue'
	| 'search_issues';

export type IntegrationAction =
	| 'respond'
	| 'send_dm'
	| 'send_channel_message'
	| 'create_issue'
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
				code: string;
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
			teamId: z.string().min(1).optional().describe('Optional Linear team ID to scope search.'),
			includeArchived: z
				.boolean()
				.optional()
				.describe('Whether to include archived issues. Defaults to false.'),
		})
		.strict(),
});

type IntegrationContextToolInput =
	| z.infer<typeof getCurrentMessageContextInputSchema>
	| z.infer<typeof getCurrentSubjectInputSchema>
	| z.infer<typeof getCurrentUserInputSchema>
	| z.infer<typeof getCurrentChannelInfoInputSchema>
	| z.infer<typeof getUserInputSchema>
	| z.infer<typeof getChannelInfoInputSchema>
	| z.infer<typeof searchUsersInputSchema>
	| z.infer<typeof searchChannelsInputSchema>
	| z.infer<typeof getIssueInputSchema>
	| z.infer<typeof searchIssuesInputSchema>;

const CONTEXT_QUERY_INPUT_SCHEMAS: Record<
	IntegrationContextQuery,
	z.ZodType<IntegrationContextToolInput>
> = {
	get_current_message_context: getCurrentMessageContextInputSchema,
	get_current_subject: getCurrentSubjectInputSchema,
	get_current_user: getCurrentUserInputSchema,
	get_current_channel_info: getCurrentChannelInfoInputSchema,
	get_user: getUserInputSchema,
	get_channel_info: getChannelInfoInputSchema,
	search_users: searchUsersInputSchema,
	search_channels: searchChannelsInputSchema,
	get_issue: getIssueInputSchema,
	search_issues: searchIssuesInputSchema,
} satisfies Record<IntegrationContextQuery, z.ZodType<IntegrationContextToolInput>>;

function buildContextInputSchema(queries: IntegrationContextQuery[]) {
	const querySchema = z.enum(toZodEnumValues(queries));
	return z
		.object({
			query: querySchema,
			input: z.record(z.string(), z.unknown()),
		})
		.superRefine((input, ctx) => {
			const operationSchema = CONTEXT_QUERY_INPUT_SCHEMAS[input.query];
			const result = operationSchema.safeParse(input);
			if (!result.success) addSchemaIssues(ctx, result.error);
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

const createIssueActionInputSchema = z.object({
	action: z.literal('create_issue'),
	input: z
		.object({
			teamId: z.string().min(1).describe('Linear team ID where the issue should be created.'),
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

type IntegrationActionToolInput =
	| z.infer<typeof respondActionInputSchema>
	| z.infer<typeof sendDmActionInputSchema>
	| z.infer<typeof sendChannelMessageActionInputSchema>
	| z.infer<typeof createIssueActionInputSchema>
	| z.infer<typeof createCommentActionInputSchema>;

const ACTION_INPUT_SCHEMAS: Record<IntegrationAction, z.ZodType<IntegrationActionToolInput>> = {
	respond: respondActionInputSchema,
	send_dm: sendDmActionInputSchema,
	send_channel_message: sendChannelMessageActionInputSchema,
	create_issue: createIssueActionInputSchema,
	create_comment: createCommentActionInputSchema,
};

function buildActionInputSchema(actions: IntegrationAction[]) {
	const actionSchema = z.enum(toZodEnumValues(actions));
	return z
		.object({
			action: actionSchema,
			input: z.record(z.string(), z.unknown()),
		})
		.superRefine((input, ctx) => {
			const operationSchema = ACTION_INPUT_SCHEMAS[input.action];
			const result = operationSchema.safeParse(input);
			if (!result.success) addSchemaIssues(ctx, result.error);
		});
}

const CONTEXT_QUERY_DESCRIPTIONS = {
	get_current_message_context:
		'get_current_message_context: no input. Returns the latest place this agent communicated in this thread.',
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
		'search_users: input.query or input.email is required. Returns matching platform user IDs for names, handles, or emails.',
	search_channels:
		'search_channels: input.query is required. Returns matching platform channel IDs for channel names or IDs.',
	get_issue:
		'get_issue: input.issueId is required. For Linear, use an issue UUID or identifier such as ENG-123. Optional input.includeComments and input.commentsLimit add recent comments.',
	search_issues:
		'search_issues: input.query is required. For Linear, returns matching issue IDs/identifiers; optional input.teamId, input.limit, and input.includeArchived narrow results.',
} satisfies Record<IntegrationContextQuery, string>;

const ACTION_DESCRIPTIONS = {
	respond:
		'respond: input.message is required. Responds in the latest message context for this integration connection.',
	send_dm:
		'send_dm: input.userId and input.message are required. userId must be a platform user ID, not a name, handle, or email.',
	send_channel_message:
		'send_channel_message: input.channelId and input.message are required. channelId must be a platform channel ID, not a channel name.',
	create_issue:
		'create_issue: input.teamId and input.title are required. For Linear, optional input.description, input.assigneeId, input.projectId, input.labelIds, input.priority, input.stateId, and input.parentId configure the issue.',
	create_comment:
		'create_comment: input.issueId and input.body are required. For Linear, optional input.parentCommentId creates a threaded reply.',
} satisfies Record<IntegrationAction, string>;

const actionSuspendSchema = z.object({
	type: z.literal('integration_action'),
	action: z.enum(['respond', 'send_dm', 'send_channel_message', 'create_issue', 'create_comment']),
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
			const persistence = ctx.persistence;
			if (
				input.query === 'get_current_message_context' ||
				input.query === 'get_current_subject' ||
				input.query === 'get_current_user' ||
				input.query === 'get_current_channel_info'
			) {
				if (!persistence) {
					return {
						ok: false,
						error: {
							code: 'NO_THREAD_CONTEXT',
							message: 'There is no current agent thread context.',
						},
					};
				}
				const context = await messageContextStore.getLatest(persistence.threadId);
				if (!context || context.integrationConnectionId !== descriptor.integrationConnectionId) {
					if (input.query === 'get_current_message_context') {
						return { ok: true, context: null };
					}
					if (input.query === 'get_current_subject') {
						return { ok: true, subject: null };
					}
					return {
						ok: false,
						error: {
							code: 'NO_MESSAGE_CONTEXT',
							message: 'There is no current message context for this integration connection.',
						},
					};
				}
				if (input.query === 'get_current_message_context') {
					return { ok: true, context };
				}
				if (input.query === 'get_current_subject') {
					return { ok: true, subject: context.subject ?? null };
				}
				if (input.query === 'get_current_user') {
					if (!context.interactingUserId) {
						return {
							ok: false,
							error: {
								code: 'NO_INTERACTING_USER_CONTEXT',
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
							code: 'NO_CHANNEL_CONTEXT',
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
				query: input.query,
				input: input.input,
				persistence,
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
			const persistence = ctx.persistence;
			const actionInput = input.input;
			const message = parseMessage(actionInput.message);
			const awaitsResponse = shouldAwaitResponse(message);

			let currentMessageContext: IntegrationMessageContext | undefined;
			if (input.action === 'respond') {
				const contextResult = await getRespondContext({
					descriptor,
					messageContextStore,
					persistence,
				});
				if (!contextResult.ok) {
					return contextResult;
				}
				currentMessageContext = contextResult.context;
			} else if (persistence) {
				currentMessageContext = await getOptionalCurrentContext({
					descriptor,
					messageContextStore,
					threadId: persistence.threadId,
				});
			}

			const result = await actionExecutor.execute({
				descriptor,
				action: input.action,
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

			return await interruptCtx.suspend({
				type: 'integration_action',
				action: input.action,
				integrationConnectionId: descriptor.integrationConnectionId,
				messageContext: actionResult.messageContext,
			});
		});
}

function buildContextToolDescription(descriptor: IntegrationToolConnectionDescriptor): string {
	return [
		`Read context from the ${descriptor.integration.type} integration connection.`,
		`Available queries: ${descriptor.contextQueries.join(', ')}.`,
		'Query inputs:',
		...descriptor.contextQueries.map((query) => `- ${CONTEXT_QUERY_DESCRIPTIONS[query]}`),
		'Use this tool for read-only lookup before choosing an action target.',
	].join('\n\n');
}

function buildActionToolDescription(descriptor: IntegrationToolConnectionDescriptor): string {
	return [
		`Take actions in the ${descriptor.integration.type} integration connection.`,
		`Available actions: ${descriptor.actions.join(', ')}.`,
		'Action inputs:',
		...descriptor.actions.map((action) => `- ${ACTION_DESCRIPTIONS[action]}`),
		'respond uses the latest message context for this integration connection.',
		'Messages may include richInteraction components. Interactive components suspend the agent until the user responds.',
	].join('\n\n');
}

function addSchemaIssues(ctx: z.RefinementCtx, error: z.ZodError): void {
	for (const issue of error.issues) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: issue.path,
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
	if (context.subject || !previousContext?.subject) return context;
	if (context.integrationConnectionId !== previousContext.integrationConnectionId) return context;
	return { ...context, subject: previousContext.subject };
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
				code: 'NO_MESSAGE_CONTEXT',
				message: 'There is no current message context. Use an explicit send action.',
			},
		};
	}

	const context = await messageContextStore.getLatest(persistence.threadId);
	if (!context) {
		return {
			ok: false,
			error: {
				code: 'NO_MESSAGE_CONTEXT',
				message: 'There is no current message context. Use an explicit send action.',
			},
		};
	}

	if (context.integrationConnectionId !== descriptor.integrationConnectionId) {
		return {
			ok: false,
			error: {
				code: 'NO_MESSAGE_CONTEXT_FOR_INTEGRATION',
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
