import { limitOf, pages, paging, path, ref, t, UserError, type Infer } from '@n8n/node-sdk';

import { gmailLabel, message } from '../gmail.node';
import {
	attachmentPrefix,
	downloadAttachments,
	getFullMessage,
	getMessage,
	labelsOf,
	messageOutput,
	messageOutputOf,
	simplify,
} from '../message';

const filters = t.obj({
	q: t.str().hint('Gmail search syntax, e.g. "is:unread from:ada@example.com"').optional(),
	readStatus: t.oneOf('both', 'unread', 'read').default('both'),
	sender: t.str().optional(),
	labelIds: t.arr(ref(gmailLabel)).hint('Label IDs, not names').optional(),
	receivedAfter: t.str().hint('ISO 8601 date or date-time').optional(),
	receivedBefore: t.str().hint('ISO 8601 date or date-time').optional(),
	includeSpamTrash: t.bool().optional(),
});

function seconds(value: string, label: 'After' | 'Before') {
	const time = Date.parse(value);
	if (Number.isNaN(time)) throw new UserError(`Invalid date/time in 'Received ${label}': ${value}`);
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
	// Major 2: `simplify: false` gives the full parsed mail.
	version: 2,
	action: 'Get many messages',
	summary: 'List messages that match a Gmail search.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	minor: 1,
	input: {
		filters: filters.optional(),
		paging,
		simplify,
		downloadAttachments,
		attachmentPrefix,
	},
	output: messageOutput,
	deriveOutput: messageOutputOf,
	async *run({ input, http, binary }) {
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
		if (!input.simplify) {
			for (const id of ids) yield await getFullMessage(http, id, { ...input, binary });
			return;
		}
		const labels = await labelsOf(http);
		for (const id of ids) yield await getMessage(http, id, labels);
	},
});
