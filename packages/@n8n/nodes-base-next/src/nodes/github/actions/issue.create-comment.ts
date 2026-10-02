import { int, nullable, obj, parse, str } from '@n8n/node-sdk';

import { issueResource } from '../github.node';
import { issuesPath } from '../issue';

const comment = obj({
	id: int(),
	html_url: str(),
	body: str(),
	user: nullable(obj({ login: str(), id: int() })),
	created_at: str(),
	updated_at: str(),
});

const open = { additionalProperties: true } as const;
const commentResponse = obj({
	id: int(),
	html_url: str(),
	body: str(),
	user: nullable(obj({ login: str(), id: int() }).with(open)),
	created_at: str(),
	updated_at: str(),
}).with(open);

export const commentOnIssue = issueResource.action('createComment', {
	action: 'Comment on an issue',
	summary: 'Add a comment to an issue or a pull request.',
	scopes: ['repo'],
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	input: {
		issueNumber: int().with({ minimum: 1 }).hint('The number shown as #123, not the ID'),
		body: str().with({ minLength: 1 }).hint('Markdown'),
	},
	output: comment,
	async run({ input, http }) {
		const response = await http.request({
			method: 'POST',
			path: `${issuesPath(input)}/${encodeURIComponent(input.issueNumber)}/comments`,
			body: { body: input.body },
		});
		const { id, html_url, body, user, created_at, updated_at } = parse(commentResponse, response);
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
