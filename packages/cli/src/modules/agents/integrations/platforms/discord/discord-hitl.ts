import type { ChannelHitlDefinition } from '../../channel-hitl';
import { approvalNode } from '../../channel-hitl';
import { requireCredentialField } from '../../credential-fields';
import { UserError } from 'n8n-workflow';
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
	fields: [
		{ name: 'guild', type: 'search' },
		{ name: 'recipient', type: 'search', kinds: ['channel', 'user'] },
	],
	async listOptions({ credential, httpClient, query }) {
		const guildId = query.guildId;
		if (query.field !== 'guild' && !guildId) throw new UserError('Select a Discord server first');
		const params = new URLSearchParams({ limit: '200' });
		if (query.cursor) {
			if (!/^\d+$/.test(query.cursor)) throw new UserError('Invalid Discord page');
			params.set('after', query.cursor);
		}
		const path =
			query.field === 'guild'
				? '/users/@me/guilds'
				: `/guilds/${guildId}/${query.field === 'user' ? 'members' : 'channels'}`;
		const response = await httpClient.request<unknown>({
			method: 'GET',
			url: `https://discord.com/api/v10${path}?${params}`,
			headers: {
				Authorization: `Bot ${requireCredentialField(credential, 'botToken', 'The Discord bot token is missing')}`,
			},
			json: true,
			disableFollowRedirect: true,
		});
		const members = query.field === 'user' ? membersSchema.parse(response) : undefined;
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
			.map((row) => ({ id: row.id, name: query.field === 'channel' ? `#${row.name}` : row.name }));
		return {
			options: options.filter((option) =>
				option.name.toLowerCase().includes(query.query.toLowerCase().replace(/^[@#]/, '')),
			),
			nextCursor: query.field !== 'channel' && rows.length === 200 ? rows.at(-1)?.id : undefined,
		};
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
