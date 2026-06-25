import {
	richMessageSchema,
	type RichCardComponent,
	type RICH_CARD_BUTTON_STYLES,
} from '@n8n/api-types';
import type { ButtonStyle } from 'chat';
import { z } from 'zod';

import {
	LINEAR_ACTION_TOOL_DEFINITIONS,
	LINEAR_CONTEXT_QUERY_TOOL_DEFINITIONS,
} from './platforms/linear-tool-definitions';
import { SLACK_ACTION_TOOL_DEFINITIONS } from './platforms/slack-tool-definitions';
import type {
	IntegrationAction,
	IntegrationActionDefinition,
	IntegrationContextQuery,
	IntegrationContextQueryDefinition,
} from './integration-tool-types';

// Compile-time: the shared button styles must remain valid Chat SDK
// `ButtonStyle` values (api-types cannot depend on the chat package).
const _assertRichCardButtonStylesAreChatSdkStyles: (typeof RICH_CARD_BUTTON_STYLES)[number] extends ButtonStyle
	? true
	: never = true;
void _assertRichCardButtonStylesAreChatSdkStyles;

/**
 * Wire schemas for rich-card messages live in `@n8n/api-types`
 * (`rich-card.schema.ts`) and are shared verbatim with the editor-ui chat
 * renderer — the contract cannot drift between backend and frontend.
 */
export const messageSchema = richMessageSchema;

/** Wire shape of a single rich-card component. */
export type IntegrationCardComponent = RichCardComponent;

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

export const GENERIC_CONTEXT_QUERY_TOOL_DEFINITIONS = [
	{
		name: 'get_current_message_context',
		inputSchema: getCurrentMessageContextInputSchema,
		description:
			'get_current_message_context: no input. Returns the latest place this agent communicated in this thread. For Slack, context.agentUserId is the bot user ID for this agent; do not look it up as another user.',
	},
	{
		name: 'get_current_subject',
		inputSchema: getCurrentSubjectInputSchema,
		description:
			'get_current_subject: no input. Returns the subject of the latest message context, such as a Linear issue, when available.',
	},
	{
		name: 'get_current_user',
		inputSchema: getCurrentUserInputSchema,
		description:
			'get_current_user: no input. Returns the latest user who interacted in the current message context.',
	},
	{
		name: 'get_current_channel_info',
		inputSchema: getCurrentChannelInfoInputSchema,
		description:
			'get_current_channel_info: no input. Returns metadata for the latest channel in the current message context.',
	},
	{
		name: 'get_user',
		inputSchema: getUserInputSchema,
		description:
			'get_user: input.userId is required. Use a platform user ID such as a Slack U... ID or Linear user UUID, not a name, handle, or email.',
	},
	{
		name: 'get_channel_info',
		inputSchema: getChannelInfoInputSchema,
		description:
			'get_channel_info: input.channelId is required. Use a platform channel ID such as a Slack C... ID, not a channel name.',
	},
	{
		name: 'search_users',
		inputSchema: searchUsersInputSchema,
		description:
			'search_users: input.query or input.email is required. Returns matching platform user IDs for names, handles, or emails. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	},
	{
		name: 'search_channels',
		inputSchema: searchChannelsInputSchema,
		description:
			'search_channels: input.query is required. Returns matching platform channel IDs for channel names or IDs. When the response includes nextCursor, pass it back as input.cursor to fetch the next page.',
	},
] satisfies IntegrationContextQueryDefinition[];

export const GENERIC_ACTION_TOOL_DEFINITIONS = [
	{
		name: 'respond',
		inputSchema: respondActionInputSchema,
		description:
			'respond: input.message is required. Responds in the latest message context for this integration connection.',
	},
	{
		name: 'send_dm',
		inputSchema: sendDmActionInputSchema,
		description:
			'send_dm: input.userId and input.message are required. userId must be a platform user ID, not a name, handle, or email.',
	},
	{
		name: 'send_channel_message',
		inputSchema: sendChannelMessageActionInputSchema,
		description:
			'send_channel_message: input.channelId and input.message are required. channelId must be a platform channel ID, not a channel name.',
	},
] satisfies IntegrationActionDefinition[];

export const DEFAULT_INTEGRATION_CONTEXT_TOOL_DEFINITIONS = GENERIC_CONTEXT_QUERY_TOOL_DEFINITIONS;

export const DEFAULT_INTEGRATION_ACTION_TOOL_DEFINITIONS = GENERIC_ACTION_TOOL_DEFINITIONS;

const ALL_CONTEXT_QUERY_TOOL_DEFINITIONS = [
	...GENERIC_CONTEXT_QUERY_TOOL_DEFINITIONS,
	...LINEAR_CONTEXT_QUERY_TOOL_DEFINITIONS,
] satisfies IntegrationContextQueryDefinition[];

const ALL_ACTION_TOOL_DEFINITIONS = [
	...GENERIC_ACTION_TOOL_DEFINITIONS,
	...SLACK_ACTION_TOOL_DEFINITIONS,
	...LINEAR_ACTION_TOOL_DEFINITIONS,
] satisfies IntegrationActionDefinition[];

// Compile-time: every operation union member must have a matching definition.
const _assertContextQueryDefinitionsAreExhaustive: IsExactUnion<
	(typeof ALL_CONTEXT_QUERY_TOOL_DEFINITIONS)[number]['name'],
	IntegrationContextQuery
> = true;

const _assertActionDefinitionsAreExhaustive: IsExactUnion<
	(typeof ALL_ACTION_TOOL_DEFINITIONS)[number]['name'],
	IntegrationAction
> = true;
void _assertContextQueryDefinitionsAreExhaustive;
void _assertActionDefinitionsAreExhaustive;

const contextDefinitionsByName = toDefinitionMap(ALL_CONTEXT_QUERY_TOOL_DEFINITIONS);
const actionDefinitionsByName = toDefinitionMap(ALL_ACTION_TOOL_DEFINITIONS);

export function resolveIntegrationContextQueryDefinitions(
	queries: IntegrationContextQuery[],
): IntegrationContextQueryDefinition[] {
	return queries.map((query) => requireDefinition(contextDefinitionsByName, query));
}

export function resolveIntegrationActionDefinitions(
	actions: IntegrationAction[],
): IntegrationActionDefinition[] {
	return actions.map((action) => requireDefinition(actionDefinitionsByName, action));
}

function toDefinitionMap<
	TName extends string,
	TDefinition extends IntegrationToolDefinition<TName>,
>(definitions: TDefinition[]): Map<TName, TDefinition> {
	const definitionsByName = new Map<TName, TDefinition>();
	for (const definition of definitions) {
		if (definitionsByName.has(definition.name)) {
			throw new Error(`Duplicate integration tool operation definition: ${definition.name}`);
		}
		definitionsByName.set(definition.name, definition);
	}
	return definitionsByName;
}

function requireDefinition<
	TName extends string,
	TDefinition extends IntegrationToolDefinition<TName>,
>(definitionsByName: Map<TName, TDefinition>, name: TName): TDefinition {
	const definition = definitionsByName.get(name);
	if (!definition) {
		throw new Error(`Unknown integration tool operation definition: ${name}`);
	}
	return definition;
}

type IntegrationToolDefinition<TName extends string> = {
	name: TName;
};

type IsExactUnion<TActual, TExpected> = [TActual] extends [TExpected]
	? [TExpected] extends [TActual]
		? true
		: never
	: never;
