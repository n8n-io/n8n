import {
	arr,
	bool,
	int,
	isRecord,
	list,
	obj,
	oneOf,
	paginate,
	str,
	variant,
	type Infer,
} from '@n8n/node-sdk';

import { message } from '../gmail.node';
import { getMessage, labelsOf, simplifiedMessage } from '../message';

const filters = obj({
	q: str().hint('Gmail search syntax, e.g. "is:unread from:ada@example.com"').optional(),
	readStatus: oneOf('both', 'unread', 'read').default('both'),
	sender: str().optional(),
	labelIds: arr(str()).hint('Label IDs, not names').optional(),
	receivedAfter: str().hint('ISO 8601 date or date-time').optional(),
	receivedBefore: str().hint('ISO 8601 date or date-time').optional(),
	includeSpamTrash: bool().optional(),
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

export const getManyGmailMessages = message.action('getAll', {
	patch: 3,
	action: 'Get many messages',
	summary: 'List messages that match a Gmail search.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		filters: filters.optional(),
		paging: variant('mode', {
			all: {},
			limit: { max: int().with({ minimum: 1, maximum: 500 }) },
		}).default({ mode: 'limit', max: 50 }),
	},
	output: simplifiedMessage,
	async *run({ input, http }) {
		const paging = input.paging ?? { mode: 'limit', max: 50 };
		const query = queryOf(input.filters);
		const pages = paginate(http, {
			request: (pageToken, room) => ({
				path: '/messages',
				query: { ...query, maxResults: room ?? 100, pageToken },
			}),
			items: (body) =>
				list(isRecord(body) ? body.messages : undefined).flatMap((entry) =>
					isRecord(entry) && typeof entry.id === 'string' ? [entry.id] : [],
				),
			next: (body) =>
				isRecord(body) && typeof body.nextPageToken === 'string' ? body.nextPageToken : undefined,
			limit: paging.mode === 'limit' ? paging.max : undefined,
		});
		const ids: string[] = [];
		for await (const id of pages) ids.push(id);
		if (ids.length === 0) return;
		const labels = await labelsOf(http);
		for (const id of ids) yield await getMessage(http, id, labels);
	},
});
