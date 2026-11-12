import type { AgentHitlOptionsPage } from '@n8n/api-types';
import type { ChannelHitlDefinition, ChannelHitlOptionsContext } from '../../channel-hitl';
import {
	approvalNode,
	matchesApprovalUser,
	matchesApprovalChannel,
	listReviewRecipients,
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
export const discordHitl: ChannelHitlDefinition = {
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
		return await listReviewRecipients(
			context.query.cursor,
			async (kind, cursor) => await listDiscordPage(context, kind, cursor),
		);
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
};

async function listDiscordPage(
	{ credential, httpClient, query }: ChannelHitlOptionsContext,
	field: 'guild' | 'channel' | 'user',
	cursor?: string,
): Promise<AgentHitlOptionsPage> {
	const guildId = query.guildId;
	if (field !== 'guild' && !guildId) throw new UserError('Select a Discord server first');
	const params = new URLSearchParams({ limit: '200' });
	if (cursor) {
		if (!/^\d+$/.test(cursor)) throw new UserError('Invalid Discord page');
		params.set('after', cursor);
	}
	const path =
		field === 'guild'
			? '/users/@me/guilds'
			: `/guilds/${guildId}/${field === 'user' ? 'members' : 'channels'}`;
	const response = await httpClient.request<unknown>({
		method: 'GET',
		url: `https://discord.com/api/v10${path}?${params}`,
		headers: {
			Authorization: `Bot ${requireCredentialField(credential, 'botToken', 'The Discord bot token is missing')}`,
		},
		json: true,
		disableFollowRedirect: true,
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
	return {
		options: options.filter((option) =>
			option.name.toLowerCase().includes(query.query.toLowerCase().replace(/^[@#]/, '')),
		),
		nextCursor: field !== 'channel' && rows.length === 200 ? rows.at(-1)?.id : undefined,
	};
}
