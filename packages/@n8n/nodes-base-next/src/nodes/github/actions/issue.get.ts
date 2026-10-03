import { path, t } from '@n8n/node-sdk';

import { issueResource } from '../github.node';
import { issue, issueOf } from '../issue';

export const getIssue = issueResource.action('get', {
	action: 'Get an issue',
	summary: 'Get one issue of a repository by its number.',
	// A private repository needs it; a public one does not.
	scopes: ['repo'],
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: { issueNumber: t.int().with({ minimum: 1 }).hint('The number shown as #123, not the ID') },
	output: issue,
	async run({ input, http }) {
		const response = await http.request({
			path: path`/repos/${input.owner}/${input.repository}/issues/${input.issueNumber}`,
		});
		return issueOf(response);
	},
});
