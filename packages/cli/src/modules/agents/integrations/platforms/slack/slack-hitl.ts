import type { AgentHitlOption, AgentHitlOptionsPage } from '@n8n/api-types';
import type { ChannelHitlDefinition, ChannelHitlOptionsContext } from '../../channel-hitl';
import {
	approvalNode,
	matchesApprovalUser,
	matchesApprovalChannel,
	listReviewRecipients,
	APPROVAL_DESTINATION_PAGE_SIZE,
} from '../../channel-hitl';
import { requireCredentialField } from '../../credential-fields';
import { OperationalError, UserError } from '@n8n/errors';
import { z } from 'zod';
import { jsonParse } from 'n8n-workflow';

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
export const slackHitl = {
	supported: true,
	channel: 'slack',
	nodeType: 'n8n-nodes-base.slack',
	credentialType: 'slackApi',
	matchesResponse(node, event) {
		return node.parameters.select === 'user'
			? matchesApprovalUser(node.parameters.user, event)
			: node.parameters.select === 'channel' &&
					matchesApprovalChannel(node.parameters.channelId, event);
	},
	fields: [{ name: 'recipient', type: 'search' }],
	async listOptions(context) {
		if (context.query.field === 'guild') throw new UserError('Slack does not use servers');
		const providerPages = new Map<string, Promise<AgentHitlOptionsPage>>();
		const load = async (kind: 'channel' | 'user', cursor: string | undefined, limit: number) =>
			await listSlackOptions(cursor, limit, async (providerCursor) => {
				const key = JSON.stringify([kind, providerCursor]);
				let page = providerPages.get(key);
				if (!page) {
					page = listSlackPage(context, kind, providerCursor);
					providerPages.set(key, page);
				}
				return await page;
			});
		const page = await listReviewRecipients(context.query.cursor, load);
		if (page.options.length === APPROVAL_DESTINATION_PAGE_SIZE || !page.nextCursor) return page;

		// Reuse slots left empty by the other recipient list.
		const remaining = await listReviewRecipients(
			page.nextCursor,
			load,
			APPROVAL_DESTINATION_PAGE_SIZE - page.options.length,
		);
		return { options: [...page.options, ...remaining.options], nextCursor: remaining.nextCursor };
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
} satisfies ChannelHitlDefinition;

const SLACK_PAGE_SIZE = 200;
const MAX_SLACK_PAGES_PER_LOOKUP = 3;
const slackCursor = z.object({
	cursor: z.string(),
	offset: z.number().int().min(1).lt(SLACK_PAGE_SIZE),
});

async function listSlackOptions(
	continuation: string | undefined,
	limit: number,
	load: (cursor: string | undefined) => Promise<AgentHitlOptionsPage>,
): Promise<AgentHitlOptionsPage> {
	let cursor = continuation;
	let offset = 0;
	if (continuation?.startsWith('{')) {
		try {
			const position = slackCursor.parse(jsonParse<unknown>(continuation));
			cursor = position.cursor || undefined;
			offset = position.offset;
		} catch {
			throw new UserError('Invalid Slack destination page');
		}
	}

	const options: AgentHitlOption[] = [];
	for (let index = 0; index < MAX_SLACK_PAGES_PER_LOOKUP; index++) {
		const page = await load(cursor);
		const count = limit - options.length;
		options.push(...page.options.slice(offset, offset + count));
		if (offset + count < page.options.length) {
			// Continue within this Slack page before advancing its cursor.
			return {
				options,
				nextCursor: JSON.stringify({ cursor: cursor ?? '', offset: offset + count }),
			};
		}
		if (!page.nextCursor || page.nextCursor === cursor) return { options };
		cursor = page.nextCursor;
		offset = 0;
		if (options.length === limit) break;
	}
	return { options, nextCursor: cursor };
}

async function listSlackPage(
	{ credential, httpClient, query }: ChannelHitlOptionsContext,
	kind: 'channel' | 'user',
	cursor: string | undefined,
): Promise<AgentHitlOptionsPage> {
	const params = new URLSearchParams({
		limit: String(SLACK_PAGE_SIZE),
		...(cursor ? { cursor } : {}),
	});
	const users = kind === 'user';
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
}
