import { arr, bool, jsonValue, obj, oneOf, paginate, parse, str } from '@n8n/node-sdk';

import { limitOf, paging } from '../../paging';
import { issueResource } from '../github.node';
import { issueOf, issue, issuesPath } from '../issue';

/** The most items GitHub returns in one page. */
const PAGE_SIZE = 100;

const filters = obj({
	state: oneOf('open', 'closed', 'all').default('open'),
	labels: arr(str()).hint('Label names; an issue must have every label').optional(),
	assignee: str().hint('A login, "none" for unassigned, or "*" for any').optional(),
	creator: str().hint('A login').optional(),
	mentioned: str().hint('A login').optional(),
	since: str().hint('ISO 8601 date-time; issues updated at or after it').optional(),
	sort: oneOf('created', 'updated', 'comments').default('created'),
	direction: oneOf('asc', 'desc').default('desc'),
});

/** A list page with its headers: GitHub gives the next page in the `link` header. */
const listPage = obj({
	body: arr(jsonValue()),
	headers: obj({ link: str().optional() }).with({ additionalProperties: true }),
}).with({ additionalProperties: true });

/** The page number in the `rel="next"` link (RFC 8288). */
function nextPage(link: string | undefined): string | undefined {
	const next = link
		?.split(',')
		.map((part) => /<([^>]+)>\s*;\s*rel="next"/.exec(part)?.[1])
		.find((url) => url !== undefined && URL.canParse(url));
	return next ? (new URL(next).searchParams.get('page') ?? undefined) : undefined;
}

export const getManyIssues = issueResource.action('getAll', {
	action: 'Get many issues',
	summary: 'List the issues of a repository that match the filters, newest first by default.',
	// A private repository needs it; a public one does not.
	scopes: ['repo'],
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		filters: filters.default({ state: 'open', sort: 'created', direction: 'desc' }),
		includePullRequests: bool()
			.default(false)
			.hint('GitHub lists pull requests as issues; true keeps them'),
		paging,
	},
	output: issue,
	async *run({ input, http }) {
		const { filters: filter } = input;
		const limit = limitOf(input.paging);
		// Page numbers count pages of one size, so the size stays the same on every page. Without
		// pull requests, a full page needs fewer requests to fill the limit.
		const perPage = input.includePullRequests ? Math.min(limit ?? PAGE_SIZE, PAGE_SIZE) : PAGE_SIZE;
		yield* paginate(http, {
			request: (page) => ({
				path: issuesPath(input),
				query: {
					state: filter.state,
					labels: filter.labels?.join(','),
					assignee: filter.assignee,
					creator: filter.creator,
					mentioned: filter.mentioned,
					since: filter.since,
					sort: filter.sort,
					direction: filter.direction,
					per_page: perPage,
					// Like the legacy node: a limited list sends no page number for its first page.
					page: page ?? (limit === undefined ? '1' : undefined),
				},
				fullResponse: true,
			}),
			items: (response) =>
				parse(listPage, response)
					.body.map(issueOf)
					.filter((entry) => input.includePullRequests || entry.pull_request === undefined),
			next: (response) => nextPage(parse(listPage, response).headers.link),
			limit,
		});
	},
});
