import { t } from '@n8n/node-sdk';

import { issueResource } from '../github.node';
import { issue, issueOf, issuesPath } from '../issue';

export const createIssue = issueResource.action('create', {
	action: 'Create an issue',
	summary: 'Open a new issue in a repository.',
	scopes: ['repo'],
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	input: {
		title: t.str().with({ minLength: 1 }),
		body: t.str().hint('Markdown').default(''),
		labels: t.arr(t.str()).hint('Label names; GitHub drops them without push access').default([]),
		assignees: t.arr(t.str()).hint('Logins of users with access to the repository').default([]),
	},
	output: issue,
	async run({ input, http }) {
		const response = await http.request({
			method: 'POST',
			path: issuesPath(input),
			body: {
				title: input.title,
				body: input.body,
				labels: input.labels,
				assignees: input.assignees,
			},
		});
		return issueOf(response);
	},
});
