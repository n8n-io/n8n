import { arr, bool, isRecord, json, obj, str } from '@n8n/node-sdk';

import { repository } from '../github.node';

/** A delivery as the legacy trigger emits it. */
const delivery = obj({
	body: json().hint('The event payload; its shape depends on the event'),
	headers: json().hint('Lower-case names, e.g. x-github-event'),
	query: json(),
});

const hookPath = ({
	owner,
	repository: name,
}: { owner: string; repository: string }): `/${string}` => `/repos/${owner}/${name}/hooks`;

export const repositoryEvent = repository.trigger('event', {
	patch: 1,
	trigger: 'On repository event',
	summary: 'Starts on each GitHub event of a repository, e.g. a push or an opened issue.',
	scopes: ['admin:repo_hook'],
	input: {
		events: arr(str()).default(['*']).hint('GitHub event names, e.g. push; * is every event'),
		insecureSSL: bool().default(false),
	},
	output: delivery,
	webhook: {
		verify: {
			algorithm: 'sha256',
			header: 'x-hub-signature-256',
			prefix: 'sha256=',
			secret: 'generated',
		},
		register: {
			create: ({ input, url, secret }) => ({
				method: 'POST',
				path: hookPath(input),
				body: {
					name: 'web',
					config: {
						url,
						content_type: 'json',
						insecure_ssl: input.insecureSSL ? '1' : '0',
						secret,
					},
					events: input.events,
					active: true,
				},
			}),
			// Like the legacy trigger: a webhook that is not active did not register.
			id: (body) =>
				isRecord(body) && body.active === true && typeof body.id === 'number'
					? String(body.id)
					: undefined,
			check: ({ input, id }) => ({ path: `${hookPath(input)}/${id}` }),
			delete: ({ input, id }) => ({ method: 'DELETE', path: `${hookPath(input)}/${id}` }),
		},
		// GitHub pings a new webhook: a hook ID without an action. It starts no execution.
		emit: (request) =>
			request.body.hook_id !== undefined && request.body.action === undefined ? [] : [request],
	},
});
