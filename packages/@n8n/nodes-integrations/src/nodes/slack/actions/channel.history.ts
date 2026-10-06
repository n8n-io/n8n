import { paging, path, ref, t, UserError } from '@n8n/node-sdk';

import { channel, slackChannelId, slackMessage, slackList, slackResponse } from '../slack.node';

const date = t.str().hint('ISO 8601 date or date-time');

function seconds(value: string, label: string) {
	const time = Date.parse(value);
	if (Number.isNaN(time)) throw new UserError(`Invalid date/time in '${label}': ${value}`);
	return time / 1000;
}

const page = slackResponse({ messages: t.arr(slackMessage) });

export const getSlackChannelHistory = channel.action('history', {
	action: 'Get message history',
	summary: 'List the messages of a Slack channel, newest first. Thread replies are not included.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	scopes: ['channels:history', 'groups:history', 'im:history', 'mpim:history'],
	input: {
		channel: ref(slackChannelId),
		filters: t
			.obj({
				oldest: date.optional(),
				latest: date.optional(),
				inclusive: t.bool().default(false).hint('Include messages exactly at oldest or latest'),
			})
			.optional(),
		paging,
	},
	output: slackMessage,
	async *run({ input, http }) {
		const { filters } = input;
		const pages = slackList(http, {
			path: path`/conversations.history`,
			query: {
				channel: input.channel,
				oldest: filters?.oldest ? seconds(filters.oldest, 'Oldest') : undefined,
				latest: filters?.latest ? seconds(filters.latest, 'Latest') : undefined,
				inclusive: filters?.inclusive ? true : undefined,
			},
			page,
			items: ({ messages }) => messages ?? [],
			paging: input.paging,
		});
		const messages = [];
		for await (const message of pages) messages.push(message);
		// Slack can break the order across pages when `oldest` is set (legacy v2.4 sorts too).
		yield* messages.sort((a, b) => Number(b.ts) - Number(a.ts));
	},
});
