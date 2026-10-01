import {
	arr,
	bool,
	compat,
	defineNode,
	defineWebhookTrigger,
	isRecord,
	json,
	obj,
	str,
} from '@n8n/node-sdk';

// The legacy credential types stay the definition. Both have the server of GitHub Enterprise.
const server = str().default('https://api.github.com');
const serverUrl = ({ server: url }: { server: string }) => url || 'https://api.github.com';

export const githubApi = compat('githubApi', { fields: { server }, baseUrl: serverUrl });
export const githubOAuth2Api = compat('githubOAuth2Api', {
	fields: { server },
	baseUrl: serverUrl,
});

export const github = defineNode({
	id: 'github',
	displayName: 'GitHub',
	credentials: [githubApi, githubOAuth2Api],
});

/** A delivery as the legacy trigger emits it. */
const delivery = obj({
	body: json().hint('The event payload; its shape depends on the event'),
	headers: json().hint('Lower-case names, e.g. x-github-event'),
	query: json(),
});

export const repositoryEvent = defineWebhookTrigger({
	node: github,
	id: 'github.repository.event',
	trigger: 'On repository event',
	summary: 'Starts on each GitHub event of a repository, e.g. a push or an opened issue.',
	input: {
		owner: str().hint('User or organization name'),
		repository: str().hint('Repository name, without the owner'),
		events: arr(str()).default(['*']).hint('GitHub event names, e.g. push; * is every event'),
		insecureSSL: bool().default(false),
	},
	output: delivery,
	verify: {
		algorithm: 'sha256',
		header: 'x-hub-signature-256',
		prefix: 'sha256=',
		secret: 'generated',
	},
	register: {
		create: ({ input, url, secret }) => ({
			method: 'POST',
			path: `/repos/${input.owner}/${input.repository}/hooks`,
			body: {
				name: 'web',
				config: { url, content_type: 'json', insecure_ssl: input.insecureSSL ? '1' : '0', secret },
				events: input.events,
				active: true,
			},
		}),
		// Like the legacy trigger: a webhook that is not active did not register.
		id: (body) =>
			isRecord(body) && body.active === true && typeof body.id === 'number'
				? String(body.id)
				: undefined,
		check: ({ input, id }) => ({ path: `/repos/${input.owner}/${input.repository}/hooks/${id}` }),
		delete: ({ input, id }) => ({
			method: 'DELETE',
			path: `/repos/${input.owner}/${input.repository}/hooks/${id}`,
		}),
	},
	// GitHub pings a new webhook: a hook ID without an action. It starts no execution.
	emit: (request) =>
		request.body.hook_id !== undefined && request.body.action === undefined ? [] : [request],
});
