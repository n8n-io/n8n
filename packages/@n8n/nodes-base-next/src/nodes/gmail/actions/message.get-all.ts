import { limitOf, pages, paging, path, t, type Infer } from '@n8n/node-sdk';

import { message } from '../gmail.node';
import { getMessage, labelsOf, simplifiedMessage } from '../message';

const filters = t.obj({
	q: t.str().hint('Gmail search syntax, e.g. "is:unread from:ada@example.com"').optional(),
	readStatus: t.oneOf('both', 'unread', 'read').default('both'),
	sender: t.str().optional(),
	labelIds: t.arr(t.str()).hint('Label IDs, not names').optional(),
	receivedAfter: t.str().hint('ISO 8601 date or date-time').optional(),
	receivedBefore: t.str().hint('ISO 8601 date or date-time').optional(),
	includeSpamTrash: t.bool().optional(),
});

function seconds(value: string, label: 'After' | 'Before') {
	const time = Date.parse(value);
	if (Number.isNaN(time)) throw new Error(`Invalid date/time in 'Received ${label}': ${value}`);
	return Math.round(time / 1000);
}

/** Mirrors `prepareQuery` in nodes-base Gmail/GenericFunctions.ts. */
function queryOf(filter: Infer<typeof filters> | undefined) {
	const q = [
		filter?.q,
		filter?.sender ? `from:${filter.sender}` : undefined,
		filter?.readStatus && filter.readStatus !== 'both' ? `is:${filter.readStatus}` : undefined,
		filter?.receivedAfter ? `after:${seconds(filter.receivedAfter, 'After')}` : undefined,
		filter?.receivedBefore ? `before:${seconds(filter.receivedBefore, 'Before')}` : undefined,
	]
		.filter((term): term is string => typeof term === 'string' && term !== '')
		.join(' ');
	return {
		q: q || undefined,
		labelIds: filter?.labelIds,
		includeSpamTrash: filter?.includeSpamTrash ? true : undefined,
	};
}

/** The IDs of one page of `messages.list`. */
const idPage = t
	.obj({
		messages: t.arr(t.obj({ id: t.str() }).with({ additionalProperties: true })).optional(),
		nextPageToken: t.str().optional(),
	})
	.with({ additionalProperties: true });

export const getManyGmailMessages = message.action('getAll', {
	minor: 1,
	action: 'Get many messages',
	summary: 'List messages that match a Gmail search.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		filters: filters.optional(),
		paging,
	},
	output: simplifiedMessage,
	async *run({ input, http }) {
		const query = queryOf(input.filters);
		const listed = pages(http, {
			page: idPage,
			// Gmail gives at most 500 IDs in one page.
			request: (pageToken, room) => ({
				path: path`/messages`,
				query: { ...query, maxResults: Math.min(room ?? 100, 500), pageToken },
			}),
			items: (page) => (page.messages ?? []).map(({ id }) => id),
			next: (page) => page.nextPageToken,
			limit: limitOf(input.paging),
		});
		const ids: string[] = [];
		for await (const id of listed) ids.push(id);
		if (ids.length === 0) return;
		const labels = await labelsOf(http);
		for (const id of ids) yield await getMessage(http, id, labels);
	},
});
