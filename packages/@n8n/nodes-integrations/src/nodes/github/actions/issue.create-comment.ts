import { parse, path, t } from '@n8n/node-sdk';

import { issueResource } from '../github.node';

const comment = t.loose(
	t.obj({
		id: t.int(),
		html_url: t.str(),
		body: t.str(),
		user: t.obj({ login: t.str(), id: t.int() }),
		created_at: t.str(),
		updated_at: t.str(),
	}),
);

export const commentOnIssue = issueResource.action('createComment', {
	action: 'Comment on an issue',
	summary: 'Add a comment to an issue or a pull request.',
	scopes: ['repo'],
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	version: '1.1.0',
	input: {
		issueNumber: t
			.int()
			.with({ minimum: 1 })
			.hint('The number shown as #123, not the ID')
			.title('Issue Number'),
		body: t.str().with({ minLength: 1 }).hint('Markdown').title('Body'),
	},
	output: comment,
	async run({ input, http }) {
		const response = await http.request({
			method: 'POST',
			path: path`/repos/${input.owner}/${input.repository}/issues/${input.issueNumber}/comments`,
			body: { body: input.body },
		});
		const { id, html_url, body, user, created_at, updated_at } = parse(comment, response);
		return {
			id,
			html_url,
			body,
			user: user && { login: user.login, id: user.id },
			created_at,
			updated_at,
		};
	},
});
