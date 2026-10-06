import { t } from '@n8n/node-sdk';

import { issueResource } from '../github.node';
import { issue, issueFrom, issueResponse } from '../issue';

const filters = t
	.obj({
		state: t.oneOf('open', 'closed', 'all').default('open').title('State'),
		labels: t
			.arr(t.str())
			.hint('Label names; an issue must have every label')
			.optional()
			.title('Labels'),
		assignee: t
			.str()
			.hint('A login, "none" for unassigned, or "*" for any')
			.optional()
			.title('Assignee'),
		creator: t.str().hint('A login').optional().title('Creator'),
		mentioned: t.str().hint('A login').optional().title('Mentioned'),
		since: t
			.str()
			.hint('ISO 8601 date-time; issues updated at or after it')
			.optional()
			.title('Updated Since'),
		sort: t.oneOf('created', 'updated', 'comments').default('created').title('Sort'),
		direction: t.oneOf('asc', 'desc').default('desc').title('Direction'),
	})
	.title('Filters');

export const getManyIssues = issueResource.action('getAll', {
	action: 'Get many issues',
	summary: 'List the issues of a repository that match the filters, newest first by default.',
	// A private repository needs it; a public one does not.
	scopes: ['repo'],
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	minor: 1,
	input: {
		filters: filters.default({ state: 'open', sort: 'created', direction: 'desc' }),
		includePullRequests: t
			.bool()
			.default(false)
			.title('Include Pull Requests')
			.hint('GitHub lists pull requests as issues; true keeps them'),
	},
	output: issue,
	list: {
		path: '/repos/{owner}/{repository}/issues',
		query: ({ filters: filter }) => ({
			state: filter.state,
			labels: filter.labels?.join(','),
			assignee: filter.assignee,
			creator: filter.creator,
			mentioned: filter.mentioned,
			since: filter.since,
			sort: filter.sort,
			direction: filter.direction,
			page: 1,
		}),
		response: t.arr(issueResponse),
		items: (page, input) =>
			page.map(issueFrom).filter((entry) => input.includePullRequests || !entry.pull_request),
		pages: { style: 'link', size: { query: 'per_page', max: 100 } },
	},
});
