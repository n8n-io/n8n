import { path, t } from '@n8n/node-sdk';

import { issueResource } from '../github.node';
import { issue, issueOf } from '../issue';

export const createIssue = issueResource.action('create', {
	action: 'Create an issue',
	summary: 'Open a new issue in a repository.',
	scopes: ['repo'],
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	version: '1.1.0',
	input: {
		title: t.str().with({ minLength: 1 }).title('Title'),
		body: t.str().hint('Markdown').default('').title('Body'),
		labels: t
			.arr(t.str())
			.hint('Label names; GitHub drops them without push access')
			.default([])
			.title('Labels'),
		assignees: t
			.arr(t.str())
			.hint('Logins of users with access to the repository')
			.default([])
			.title('Assignees'),
	},
	output: issue,
	async run({ input, http }) {
		const response = await http.request({
			method: 'POST',
			path: path`/repos/${input.owner}/${input.repository}/issues`,
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
