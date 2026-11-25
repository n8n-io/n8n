import type { AgentHitlOptionsPage } from '@n8n/api-types';
import { httpStatusFromError } from '@n8n/backend-network';
import type { ChannelHitlDefinition, ChannelHitlOptionsContext } from '../../channel-hitl';
import {
	approvalNode,
	matchesApprovalUser,
	matchesApprovalChannel,
	listReviewRecipients,
	APPROVAL_DESTINATION_PAGE_SIZE,
} from '../../channel-hitl';
import { requireCredentialField } from '../../credential-fields';
import { UserError } from '@n8n/errors';
import { z } from 'zod';

const idName = z.object({ id: z.string(), name: z.string() });
const membersSchema = z.array(
	z.object({
		nick: z.string().nullable().optional(),
		user: z.object({
			id: z.string(),
			username: z.string(),
			global_name: z.string().nullable().optional(),
			bot: z.boolean().optional(),
		}),
	}),
);
export const discordHitl = {
	supported: true,
	channel: 'discord',
	nodeType: 'n8n-nodes-base.discord',
	credentialType: 'discordBotApi',
	matchesResponse(node, event) {
		return node.parameters.sendTo === 'user'
			? matchesApprovalUser(node.parameters.userId, event)
			: node.parameters.sendTo === 'channel' &&
					matchesApprovalChannel(node.parameters.channelId, event);
	},
	fields: [
		{ name: 'guild', type: 'search' },
		{ name: 'recipient', type: 'search' },
	],
	async listOptions(context) {
		if (context.query.field === 'guild')
			return await listDiscordPage(context, 'guild', context.query.cursor);
		return await listReviewRecipients(context.query.cursor, async (kind, cursor, limit) => {
			return await listDiscordPage(context, kind, cursor, limit);
		});
	},
	createNode(configuration) {
		if (!configuration.guildId || !/^\d+$/.test(configuration.recipient.id))
			throw new UserError('Select a Discord server and approval destination');
		return approvalNode('n8n-nodes-base.discord', 2, 'discordBotApi', configuration, {
			authentication: 'botToken',
			guildId: { __rl: true, mode: 'id', value: configuration.guildId },
			sendTo: configuration.recipient.kind,
			[configuration.recipient.kind === 'user' ? 'userId' : 'channelId']: {
				__rl: true,
				mode: 'id',
				value: configuration.recipient.id,
			},
		});
	},
} satisfies ChannelHitlDefinition;

async function listDiscordPage(
	{ credential, httpClient, query }: ChannelHitlOptionsContext,
	field: 'guild' | 'channel' | 'user',
	cursor?: string,
	limit = APPROVAL_DESTINATION_PAGE_SIZE,
): Promise<AgentHitlOptionsPage> {
	const guildId = query.guildId;
	if (field !== 'guild' && !guildId) throw new UserError('Select a Discord server first');
	const search = query.query.trim().toLowerCase().replace(/^[@#]/, '');
	const searchMembers = field === 'user' && search.length > 0;
	const params = new URLSearchParams(field === 'channel' ? {} : { limit: String(limit) });
	if (cursor) {
		if (!/^\d+$/.test(cursor)) throw new UserError('Invalid Discord page');
		if (field !== 'channel' && !searchMembers) params.set('after', cursor);
	}
	if (searchMembers) params.set('query', search);
	const path =
		field === 'guild'
			? '/users/@me/guilds'
			: `/guilds/${guildId}/${field === 'user' ? (searchMembers ? 'members/search' : 'members') : 'channels'}`;
	const response = await httpClient
		.request<unknown>({
			method: 'GET',
			url: `https://discord.com/api/v10${path}?${params}`,
			headers: {
				Authorization: `Bot ${requireCredentialField(credential, 'botToken', 'The Discord bot token is missing')}`,
			},
			json: true,
			disableFollowRedirect: true,
		})
		.catch((error: unknown) => {
			// Discord requires the Server Members intent for browsing the member list.
			if (field === 'user' && !searchMembers && httpStatusFromError(error) === 403) return [];
			throw error;
		});
	const members = field === 'user' ? membersSchema.parse(response) : undefined;
	const rows = members
		? members.map((member) => ({
				id: member.user.id,
				name: member.nick || member.user.global_name || member.user.username,
				bot: member.user.bot,
			}))
		: z.array(idName.extend({ type: z.number().optional() })).parse(response);
	const options = rows
		.filter(
			(row) =>
				(!('bot' in row) || !row.bot) &&
				(!('type' in row) || row.type === undefined || row.type === 0 || row.type === 5),
		)
		.map((row) => ({ id: row.id, name: field === 'channel' ? `#${row.name}` : row.name }));
	if (searchMembers) return { options };
	if (field === 'channel') {
		// Discord returns the server's complete channel list in one request.
		const start = cursor ? options.findIndex((option) => option.id === cursor) + 1 : 0;
		const remaining = options
			.slice(start)
			.filter((option) => option.name.toLowerCase().includes(search));
		const page = remaining.slice(0, limit);
		return { options: page, nextCursor: remaining.length > limit ? page.at(-1)?.id : undefined };
	}
	return {
		options: options.filter((option) => option.name.toLowerCase().includes(search)),
		nextCursor: rows.length === limit ? rows.at(-1)?.id : undefined,
	};
}
