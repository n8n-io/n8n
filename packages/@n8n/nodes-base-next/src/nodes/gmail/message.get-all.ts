import {
	arr,
	bool,
	defineAction,
	int,
	isRecord,
	obj,
	oneOf,
	str,
	variant,
	type Http,
	type Infer,
} from '@n8n/node-sdk';

import { getMessage, gmail, labelsOf, simplifiedMessage } from './node';

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
function queryOf(filter: Infer<typeof filters> | undefined, maxResults: number) {
	const q = [
		filter?.q,
		filter?.sender ? `from:${filter.sender}` : undefined,
		filter?.readStatus && filter.readStatus !== 'both' ? `is:${filter.readStatus}` : undefined,
		filter?.receivedAfter ? `after:${seconds(filter.receivedAfter, 'After')}` : undefined,
		filter?.receivedBefore ? `before:${seconds(filter.receivedBefore, 'Before')}` : undefined,
	]
		.filter((term): term is string => typeof term === 'string' && term !== '')
		.join(' ');
	return [
		...(q ? [['q', q]] : []),
		...(filter?.labelIds ?? []).map((id) => ['labelIds', id]),
		...(filter?.includeSpamTrash ? [['includeSpamTrash', 'true']] : []),
		['maxResults', String(maxResults)],
	];
}

/** Message IDs, one page per request; `limit` stops after the first page like the v2 node. */
async function listIds(
	http: Http,
	query: string[][],
	pageToken: string | undefined,
	all: boolean,
): Promise<string[]> {
	const params = new URLSearchParams([...query, ...(pageToken ? [['pageToken', pageToken]] : [])]);
	const response = await http.request({ path: `/messages?${params.toString()}` });
	const page = isRecord(response) ? response : {};
	const ids = (Array.isArray(page.messages) ? page.messages : []).flatMap((entry: unknown) =>
		isRecord(entry) && typeof entry.id === 'string' ? [entry.id] : [],
	);
	const next = typeof page.nextPageToken === 'string' ? page.nextPageToken : '';
	return all && next ? [...ids, ...(await listIds(http, query, next, all))] : ids;
}

export const getManyGmailMessages = defineAction({
	node: gmail,
	id: 'gmail.message.getAll',
	patch: 1,
	action: 'Get many messages',
	summary: 'List messages that match a Gmail search.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	input: {
		filters: filters.optional(),
		paging: variant('mode', {
			all: {},
			limit: { max: int().with({ minimum: 1, maximum: 500 }) },
		}).default({ mode: 'limit', max: 50 }),
	},
	output: simplifiedMessage,
	async run({ input, http, emit }) {
		const paging = input.paging ?? { mode: 'limit', max: 50 };
		const all = paging.mode === 'all';
		const ids = await listIds(http, queryOf(input.filters, all ? 100 : paging.max), undefined, all);
		if (ids.length === 0) return;
		const labels = await labelsOf(http);
		for (const id of ids) emit(await getMessage(http, id, labels));
	},
});
