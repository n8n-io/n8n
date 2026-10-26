import type { ChannelHitlDefinition } from '../../channel-hitl';
import { approvalNode } from '../../channel-hitl';
import { requireCredentialField } from '../../credential-fields';
import { OperationalError, UserError } from 'n8n-workflow';
import { z } from 'zod';

const resultSchema = z.object({
	ok: z.boolean(),
	error: z.string().optional(),
	channels: z
		.array(z.object({ id: z.string(), name: z.string(), is_member: z.boolean().optional() }))
		.optional(),
	members: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				deleted: z.boolean().optional(),
				is_bot: z.boolean().optional(),
				profile: z
					.object({ real_name: z.string().optional(), display_name: z.string().optional() })
					.optional(),
			}),
		)
		.optional(),
	response_metadata: z.object({ next_cursor: z.string().optional() }).optional(),
});
export const slackHitl: ChannelHitlDefinition = {
	supported: true,
	fields: [{ name: 'recipient', type: 'search', kinds: ['channel', 'user'] }],
	async listOptions({ credential, httpClient, query }) {
		if (query.field === 'guild') throw new UserError('Slack does not use servers');
		const params = new URLSearchParams({
			limit: '200',
			...(query.cursor ? { cursor: query.cursor } : {}),
		});
		const users = query.field === 'user';
		if (!users) {
			params.set('types', 'public_channel,private_channel');
			params.set('exclude_archived', 'true');
		}
		const response = await httpClient.request<unknown>({
			method: 'GET',
			url: `https://slack.com/api/${users ? 'users.list' : 'conversations.list'}?${params}`,
			headers: {
				Authorization: `Bearer ${requireCredentialField(credential, 'accessToken', 'The Slack access token is missing')}`,
			},
			json: true,
			disableFollowRedirect: true,
		});
		const data = resultSchema.parse(response);
		if (!data.ok)
			throw new OperationalError(
				`Slack could not list approval destinations: ${data.error ?? 'unknown_error'}`,
			);
		const options = users
			? (data.members ?? [])
					.filter((user) => !user.deleted && !user.is_bot)
					.map((user) => ({
						id: user.id,
						name: user.profile?.display_name || user.profile?.real_name || user.name,
					}))
			: (data.channels ?? [])
					.filter((channel) => channel.is_member !== false)
					.map((channel) => ({ id: channel.id, name: `#${channel.name}` }));
		return {
			options: options.filter((option) =>
				option.name.toLowerCase().includes(query.query.toLowerCase().replace(/^[@#]/, '')),
			),
			nextCursor: data.response_metadata?.next_cursor || undefined,
		};
	},
	createNode(configuration) {
		return approvalNode('n8n-nodes-base.slack', 2.2, 'slackApi', configuration, {
			authentication: 'accessToken',
			select: configuration.recipient.kind,
			[configuration.recipient.kind === 'user' ? 'user' : 'channelId']: {
				__rl: true,
				mode: 'id',
				value: configuration.recipient.id,
			},
		});
	},
};
