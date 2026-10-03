import { path, t } from '@n8n/node-sdk';

import { issueResource } from '../github.node';
import { issue, issueOf } from '../issue';

export const updateIssue = issueResource.action('update', {
	action: 'Update an issue',
	summary: 'Change the title, body, state, labels or assignees of an issue. Unset fields stay.',
	scopes: ['repo'],
	flow: { effect: 'write', cardinality: 'per-item', idempotent: true },
	input: {
		issueNumber: t.int().with({ minimum: 1 }).hint('The number shown as #123, not the ID'),
		title: t.str().with({ minLength: 1 }).optional(),
		body: t.str().hint('Markdown').optional(),
		state: t.oneOf('open', 'closed').optional(),
		stateReason: t.oneOf('completed', 'not_planned', 'reopened').optional(),
		labels: t.arr(t.str()).hint('Replaces every label of the issue').optional(),
		assignees: t.arr(t.str()).hint('Replaces every assignee of the issue').optional(),
	},
	output: issue,
	async run({ input, http }) {
		const response = await http.request({
			method: 'PATCH',
			path: path`/repos/${input.owner}/${input.repository}/issues/${input.issueNumber}`,
			body: {
				title: input.title,
				body: input.body,
				state: input.state,
				state_reason: input.stateReason,
				labels: input.labels,
				assignees: input.assignees,
			},
		});
		return issueOf(response);
	},
});
