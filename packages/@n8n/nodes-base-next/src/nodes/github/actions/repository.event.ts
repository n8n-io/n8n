import { parse, path, t } from '@n8n/node-sdk';

import { repository } from '../github.node';

/** A delivery as the legacy trigger emits it. */
const delivery = t.obj({
	body: t.json().hint('The event payload; its shape depends on the event'),
	headers: t.json().hint('Lower-case names, e.g. x-github-event'),
	query: t.json(),
});

/** The fields of a create response that registration reads. */
const createdHook = t.obj({ id: t.int(), active: t.bool() }).with({ additionalProperties: true });

export const repositoryEvent = repository.trigger('event', {
	patch: 2,
	trigger: 'On repository event',
	summary: 'Starts on each GitHub event of a repository, e.g. a push or an opened issue.',
	scopes: ['admin:repo_hook'],
	input: {
		events: t.arr(t.str()).default(['*']).hint('GitHub event names, e.g. push; * is every event'),
		insecureSSL: t.bool().default(false),
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
				path: path`/repos/${input.owner}/${input.repository}/hooks`,
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
			id: (body) => {
				const { id, active } = parse(createdHook, body);
				return active ? String(id) : undefined;
			},
			check: ({ input, id }) => ({
				path: path`/repos/${input.owner}/${input.repository}/hooks/${id}`,
			}),
			delete: ({ input, id }) => ({
				method: 'DELETE',
				path: path`/repos/${input.owner}/${input.repository}/hooks/${id}`,
			}),
		},
		// GitHub pings a new webhook: a hook ID without an action. It starts no execution.
		emit: (request) =>
			request.body.hook_id !== undefined && request.body.action === undefined ? [] : [request],
	},
});
