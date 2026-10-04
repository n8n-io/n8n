import {
	assertUrlAllowed,
	DomainNotAllowedError,
	type IDataObject,
	type IHttpRequestOptions,
	type INode,
	type INodeType,
} from 'n8n-workflow';

import { generateNodeModule } from '../entry/codegen';
import { compat, credential, defineCredential } from '../entry/credentials';
import {
	permissionsOf,
	setPermissionRefusalListener,
	toCredentialType,
	toTriggerNodeType,
	type ContractPermissions,
	type PermissionRefusal,
} from '../entry/host';
import {
	contractHash,
	diffContracts,
	lintContract,
	toContract,
	type ContractDocument,
} from '../entry/registry';
import { defineNode, pages, path, provider, t, type EncodedPath, type HttpRequest } from '../index';
import type { AnyCredentialType } from '../credentials';
import type { CredentialManifest } from '../manifest';
import { allowsHost, credentialHostsOf, egressIssuesOf, narrowHosts } from '../egress';
import {
	executorOf,
	setCredentialManifests,
	toRequestOptions,
	withCredentialHostsOf,
	type ExecutorHost,
} from '../runtime';

const node: INode = {
	id: '1',
	name: 'Echo',
	type: 'echo',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	credentials: { echoApi: { id: '1', name: 'Echo account' } },
};

const echoApi = compat('echoApi', { hosts: ['api.echo.test'] });
const headerAuth = compat('httpHeaderAuth');
const serverApi = compat('serverApi', {
	fields: { server: t.str().default('https://api.server.test') },
	baseUrl: '{server}',
});

const echo = defineNode({
	id: 'echo',
	displayName: 'Echo',
	credential: credential({ types: [echoApi, headerAuth, serverApi], optional: true }),
	baseUrl: 'https://api.echo.test/v1',
});

const output = t.obj({ ok: t.str() });

/** An action whose `run()` sends each request of `requests` and returns the last body. */
const sender = (requests: readonly HttpRequest[]) =>
	echo.action('send', {
		action: 'Send',
		summary: 'Send requests.',
		flow: { effect: 'read', cardinality: 'per-item' },
		input: { url: t.str().optional() },
		output,
		async run({ http }) {
			const bodies = await requests.reduce<Promise<unknown[]>>(
				async (sent, request) => [...(await sent), await http.request(request)],
				Promise.resolve([]),
			);
			return { ok: String(bodies.length) };
		},
	});

const fetchUrl = echo.action('fetch', {
	action: 'Fetch a URL',
	summary: 'GET any URL.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	egress: { fromInput: 'url' },
	input: { url: t.str() },
	output,
	async run({ input, http }) {
		await http.request({ url: input.url });
		return { ok: 'yes' };
	},
});

const regional = echo.action('regional', {
	action: 'Regional',
	summary: 'Call a regional API.',
	flow: { effect: 'read', cardinality: 'per-item' },
	egress: { hosts: ['{region}.region.echo.test'] },
	input: { region: t.oneOf('eu', 'us') },
	output,
	async run({ input, http }) {
		await http.request({ url: `https://${input.region}.region.echo.test/x` });
		return { ok: 'yes' };
	},
});

interface HostSetup {
	readonly credentialType?: string;
	readonly data?: IDataObject;
	readonly parameters?: Record<string, unknown>;
	readonly replies?: unknown[];
}

function hostOf({ credentialType, data = {}, parameters = {}, replies = [] }: HostSetup) {
	const sent: IHttpRequestOptions[] = [];
	const host: ExecutorHost = {
		items: [{ json: {} }],
		node,
		parameter: (name) =>
			name === 'authentication' ? (credentialType ?? 'none') : parameters[name],
		request: async (options) => {
			sent.push(options);
			const reply = replies[sent.length - 1];
			if (reply instanceof Error) throw reply;
			return reply ?? {};
		},
		credentialData: async () => await Promise.resolve(data),
		continueOnFail: () => false,
		wait: async () => {},
	};
	return { host, sent };
}

const DOMAINS = { allowedHttpRequestDomains: 'domains', allowedDomains: 'allowed.test' };

describe('host egress', () => {
	it('refuses a host outside the allowed hosts and sends no request', async () => {
		const { host, sent } = hostOf({ credentialType: 'echoApi' });
		await expect(executorOf(sender([{ url: 'https://other.test/x' }]))(host)).rejects.toThrow(
			'Host not allowed: echo.send may send requests to api.echo.test, not to other.test',
		);
		expect(sent).toEqual([]);
	});

	it('sets allowedDomains on each allowed request, so the request layer checks redirects', async () => {
		const { host, sent } = hostOf({ credentialType: 'echoApi' });
		await executorOf(sender([{ path: path`/a` }, { url: 'https://api.echo.test/b' }]))(host);
		expect(sent.map(({ url, allowedDomains }) => [url, allowedDomains])).toEqual([
			['https://api.echo.test/v1/a', 'api.echo.test'],
			['https://api.echo.test/b', 'api.echo.test'],
		]);
	});

	it('refuses a redirect hop to a host outside the allowed hosts', async () => {
		const { host, sent } = hostOf({ credentialType: 'echoApi' });
		await executorOf(sender([{ path: path`/a` }]))(host);
		const [options] = sent;
		expect(() =>
			assertUrlAllowed({ url: 'https://other.test/x', allowedDomains: options?.allowedDomains }),
		).toThrow('Domain not allowed');
	});

	it('refuses a path that would leave the base URL', () => {
		const base = 'https://api.echo.test';
		const paths = ['//other.test/x', '/\\other.test/x', '/\t/other.test/x', 'x', '@other.test/x'];
		paths.forEach((unsafe) => {
			expect(() => toRequestOptions({ path: unsafe as EncodedPath }, base)).toThrow();
		});
		expect(toRequestOptions({ path: path`/users` }, 'https://api.echo.test/v1/').url).toBe(
			'https://api.echo.test/v1/users',
		);
	});

	it('refuses an absolute URL that is not http or https', () => {
		['file:///etc/hosts', 'ftp://api.echo.test/x', 'api.echo.test/x'].forEach((url) => {
			expect(() => toRequestOptions({ url }, undefined)).toThrow(
				'The request URL must be an absolute http or https URL',
			);
		});
	});

	it('checks every page, so a next link to another host is refused', async () => {
		const linked = echo.action('pages', {
			action: 'Pages',
			summary: 'Read pages.',
			flow: { effect: 'read', cardinality: '1:N' },
			input: {},
			output,
			async *run({ http }) {
				yield* pages(http, {
					page: t.obj({ next: t.str() }),
					request: (cursor) => (cursor ? { url: cursor } : { path: path`/items` }),
					items: () => [{ ok: 'page' }],
					next: (body) => body.next,
				});
			},
		});
		const { host, sent } = hostOf({
			credentialType: 'echoApi',
			replies: [{ next: 'https://other.test/page2' }],
		});
		await expect(executorOf(linked)(host)).rejects.toThrow('not to other.test');
		expect(sent).toHaveLength(1);
	});

	it('does not retry a refused request', async () => {
		const { host, sent } = hostOf({ credentialType: 'echoApi' });
		const retried = sender([{ url: 'https://other.test/x', retry: true }]);
		await expect(executorOf(retried)(host)).rejects.toThrow('Host not allowed');
		expect(sent).toEqual([]);
	});

	it('allows a host from input that the credential list allows, and refuses another', async () => {
		const allowed = hostOf({
			credentialType: 'httpHeaderAuth',
			data: DOMAINS,
			parameters: { url: 'https://allowed.test/x' },
		});
		await executorOf(fetchUrl)(allowed.host);
		expect(allowed.sent.map(({ allowedDomains }) => allowedDomains)).toEqual(['allowed.test']);

		const refused = hostOf({
			credentialType: 'httpHeaderAuth',
			data: DOMAINS,
			parameters: { url: 'https://other.test/x' },
		});
		await expect(executorOf(fetchUrl)(refused.host)).rejects.toThrow(
			'Domain not allowed: This credential is restricted from accessing other.test. Only the following domains are allowed: allowed.test',
		);
		expect(refused.sent).toEqual([]);
	});

	it('does not limit the redirect hops of a host from input without a credential limit', async () => {
		const { host, sent } = hostOf({ parameters: { url: 'https://any.test/x' } });
		await executorOf(fetchUrl)(host);
		expect(sent[0]?.allowedDomains).toBeUndefined();
	});

	it('refuses a host from input outside the input hosts of the host and sends no request', async () => {
		const { host, sent } = hostOf({ parameters: { url: 'https://other.test/x' } });
		await expect(
			executorOf(fetchUrl)({ ...host, egressInputHosts: ['allowed.test', '*.allowed.test'] }),
		).rejects.toThrow(
			'Host not allowed: this n8n instance lets a URL from input reach only allowed.test, *.allowed.test, not other.test',
		);
		expect(sent).toEqual([]);
	});

	it('limits the redirect hops of a host from input to the node hosts and the input hosts', async () => {
		const { host, sent } = hostOf({ parameters: { url: 'https://api.allowed.test/x' } });
		await executorOf(fetchUrl)({ ...host, egressInputHosts: ['*.allowed.test'] });
		expect(sent.map(({ allowedDomains }) => allowedDomains)).toEqual([
			'api.echo.test, *.allowed.test',
		]);
	});

	it('keeps a typed credential on its own hosts when its setting is none', async () => {
		const { host, sent } = hostOf({
			credentialType: 'echoApi',
			data: { allowedHttpRequestDomains: 'none' },
		});
		await executorOf(sender([{ path: path`/a` }]))(host);
		expect(sent).toHaveLength(1);
	});

	it('refuses an untyped credential whose setting is none', async () => {
		const { host, sent } = hostOf({
			credentialType: 'httpHeaderAuth',
			data: { allowedHttpRequestDomains: 'none' },
		});
		await expect(executorOf(sender([{ path: path`/a` }]))(host)).rejects.toThrow(
			'This credential is configured to prevent use within an Echo node',
		);
		expect(sent).toEqual([]);
	});

	it('refuses every host for a credential type with an empty host list', async () => {
		const closed = defineNode({
			id: 'closed',
			displayName: 'Closed',
			credential: credential({ types: [compat('closedApi', { hosts: [] })] }),
			baseUrl: 'https://api.closed.test',
		});
		const ping = closed.action('ping', {
			action: 'Ping',
			summary: 'Ping.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {},
			output,
			async run({ http }) {
				await http.request({ path: path`/ping` });
				return { ok: 'yes' };
			},
		});
		const { host, sent } = hostOf({ credentialType: 'closedApi' });
		await expect(
			executorOf(ping)({
				...host,
				node: { ...node, credentials: { closedApi: { id: '2', name: 'Closed' } } },
			}),
		).rejects.toThrow(
			'Host not allowed: the credential of closed.ping may not go to api.closed.test',
		);
		expect(sent).toEqual([]);
	});

	it('refuses every request of an action without egress and without a base URL', async () => {
		const bare = defineNode({ id: 'bare', displayName: 'Bare' });
		const probe = bare.action('probe', {
			action: 'Probe',
			summary: 'Probe.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {},
			output,
			async run({ http }) {
				await http.request({ url: 'https://api.example.com/x' });
				return { ok: 'yes' };
			},
		});
		const { host, sent } = hostOf({});
		await expect(executorOf(probe)(host)).rejects.toThrow(
			'Host not allowed: bare.probe may send requests to no host, not to api.example.com',
		);
		expect(sent).toEqual([]);
	});

	it('takes the host of a credential base URL from its fields', async () => {
		const { host, sent } = hostOf({
			credentialType: 'serverApi',
			data: { server: 'https://git.example.test/api/v3' },
		});
		await executorOf(sender([{ path: path`/repos` }]))(host);
		expect(sent.map(({ url, allowedDomains }) => [url, allowedDomains])).toEqual([
			['https://git.example.test/api/v3/repos', 'git.example.test'],
		]);
	});

	it('fills a host template from an enum input field', async () => {
		const { host, sent } = hostOf({ parameters: { region: 'eu' } });
		await executorOf(regional)(host);
		expect(sent.map(({ url }) => url)).toEqual(['https://eu.region.echo.test/x']);
	});

	it('rejects a host template field that is not an enum input field', () => {
		echo.action('bad', {
			action: 'Bad',
			summary: 'Bad host.',
			flow: { effect: 'read', cardinality: 'per-item' },
			// @ts-expect-error `name` is a free string, so the host set is not finite
			egress: { hosts: ['{name}.echo.test'] },
			input: { name: t.str() },
			output,
			async run() {
				return await Promise.resolve({ ok: 'no' });
			},
		});
	});

	it('applies the credential hosts to trigger requests', async () => {
		const polled = echo.trigger('changed', {
			trigger: 'On change',
			summary: 'Starts on a change.',
			input: {},
			output,
			poll: {
				request: () => ({ url: 'https://other.test/changes' }),
				response: t.arr(t.obj({ id: t.int() })),
				items: (page) => page,
				cursor: { id: () => 1 },
			},
		});
		const sent: IHttpRequestOptions[] = [];
		const context = {
			getNode: () => node,
			getNodeParameter: (name: string) => (name === 'authentication' ? 'echoApi' : undefined),
			getWorkflowStaticData: () => ({}),
			getMode: () => 'trigger',
			getCredentials: async () => await Promise.resolve({}),
			helpers: {
				httpRequestWithAuthentication: async (_type: string, options: IHttpRequestOptions) => {
					sent.push(options);
					return await Promise.resolve([]);
				},
			},
		};
		const type: INodeType = new (toTriggerNodeType(polled))();
		await expect(type.poll?.call(context as never)).rejects.toThrow('not to other.test');
		expect(sent).toEqual([]);
	});
});

describe('permission refusals', () => {
	const refusals: PermissionRefusal[] = [];

	beforeEach(() => {
		refusals.length = 0;
		setPermissionRefusalListener((refusal) => refusals.push(refusal));
	});

	afterEach(() => setPermissionRefusalListener(undefined));

	it('reports one refused request with the node, the action, the permission and the host', async () => {
		const { host } = hostOf({ credentialType: 'echoApi' });
		await expect(executorOf(sender([{ url: 'https://other.test/x' }]))(host)).rejects.toThrow();
		expect(refusals).toEqual([
			{
				node,
				action: 'echo.send',
				permission: 'egress',
				host: 'other.test',
				message:
					'Host not allowed: echo.send may send requests to api.echo.test, not to other.test',
			},
		]);
	});

	it('reports a host from input outside the input hosts of the host', async () => {
		const { host } = hostOf({ parameters: { url: 'https://other.test/x' } });
		await expect(
			executorOf(fetchUrl)({ ...host, egressInputHosts: ['allowed.test'] }),
		).rejects.toThrow();
		expect(refusals).toEqual([
			expect.objectContaining({
				node,
				action: 'echo.fetch',
				permission: 'egress-input',
				host: 'other.test',
			}),
		]);
	});

	it('reports a host outside the hosts of the credential', async () => {
		const { host } = hostOf({
			credentialType: 'httpHeaderAuth',
			data: DOMAINS,
			parameters: { url: 'https://other.test/x' },
		});
		await expect(executorOf(fetchUrl)(host)).rejects.toThrow('Domain not allowed');
		expect(refusals).toEqual([
			expect.objectContaining({ permission: 'credential-hosts', host: 'other.test' }),
		]);
	});

	it('reports a redirect hop that the request layer refused, once, with its host', async () => {
		const hop = new DomainNotAllowedError('Domain not allowed: evil.test', 'evil.test');
		const wrapped = new Error('The service refused the request', {
			cause: new Error('Redirected request failed', { cause: hop }),
		});
		const { host } = hostOf({ credentialType: 'echoApi', replies: [wrapped] });
		await expect(executorOf(sender([{ path: path`/a` }]))(host)).rejects.toThrow();
		expect(refusals).toEqual([
			{
				node,
				action: 'echo.send',
				permission: 'egress',
				host: 'evil.test',
				message: 'Domain not allowed: evil.test',
			},
		]);
	});

	it('reports nothing for an allowed request', async () => {
		const { host } = hostOf({ credentialType: 'echoApi' });
		await executorOf(sender([{ path: path`/a` }]))(host);
		expect(refusals).toEqual([]);
	});

	it('refuses the request with its own error when the listener throws', async () => {
		setPermissionRefusalListener(() => {
			throw new Error('listener failed');
		});
		const { host } = hostOf({ credentialType: 'echoApi' });
		await expect(executorOf(sender([{ url: 'https://other.test/x' }]))(host)).rejects.toThrow(
			'Host not allowed',
		);
	});
});

describe('credentialHostsOf', () => {
	const surface = { surface: 'HTTP Request' };

	it('gives the declared hosts and adds the user list', () => {
		expect(credentialHostsOf(echoApi, {}, surface)).toEqual(['api.echo.test']);
		expect(credentialHostsOf(echoApi, DOMAINS, surface)).toEqual(['api.echo.test', 'allowed.test']);
		expect(credentialHostsOf(echoApi, { allowedHttpRequestDomains: 'all' }, surface)).toEqual([
			'api.echo.test',
		]);
	});

	it('derives a host from the credential base URL', () => {
		const base = { ...surface, baseUrl: 'https://git.example.test/api/v3' };
		expect(credentialHostsOf(serverApi, {}, base)).toEqual(['git.example.test']);
	});

	it('keeps the legacy meaning for a type without hosts', () => {
		expect(credentialHostsOf(headerAuth, {}, surface)).toBeUndefined();
		expect(
			credentialHostsOf(headerAuth, { allowedHttpRequestDomains: 'all' }, surface),
		).toBeUndefined();
		expect(
			credentialHostsOf(
				headerAuth,
				{ ...DOMAINS, allowedDomains: ' Allowed.test , *.b.test ' },
				surface,
			),
		).toEqual(['allowed.test', '*.b.test']);
		expect(() =>
			credentialHostsOf(headerAuth, { allowedHttpRequestDomains: 'none' }, surface),
		).toThrow('This credential is configured to prevent use within an HTTP Request node');
		expect(() =>
			credentialHostsOf(headerAuth, { allowedHttpRequestDomains: 'domains' }, surface),
		).toThrow('No allowed domains specified');
	});

	it('rejects a declared host that is not a host', () => {
		expect(() => compat('badApi', { hosts: ['https://api.bad.test'] })).toThrow('is not a host');
		expect(() => compat('badApi', { hosts: ['*'] })).toThrow('is not a host');
	});

	it('keeps allowedDomains when a custom signer builds new options', async () => {
		const signed = defineCredential({
			id: 'signed.custom',
			legacyName: 'signedApi',
			displayName: 'Signed API',
			hosts: ['api.signed.test'],
			auth: (a) =>
				a.custom({
					reason: 'The signer builds new options',
					async sign(_data, request) {
						return await Promise.resolve({ method: request.method, url: request.url });
					},
				}),
		});
		const authenticate = toCredentialType(signed)?.authenticate;
		if (typeof authenticate !== 'function') throw new Error('no custom authenticate');
		const options = await authenticate(
			{},
			{ url: 'https://api.signed.test/x', allowedDomains: 'api.signed.test' },
		);
		expect(options.allowedDomains).toBe('api.signed.test');
	});
});

describe('narrowHosts', () => {
	it.each([
		[['a.test'], ['a.test', 'b.test'], ['a.test']],
		[['*.a.test'], ['x.a.test'], ['x.a.test']],
		[['*.a.test'], ['*.x.a.test'], ['*.x.a.test']],
		[['*.a.test'], ['*.a.test'], ['*.a.test']],
		[['a.test'], ['b.test'], []],
		[['*.a.test'], ['a.test'], []],
	])('narrows %j and %j to %j', (a, b, expected) => {
		expect(narrowHosts(a, b)).toEqual(expected);
		expect(narrowHosts(b, a).sort()).toEqual([...expected].sort());
	});

	it('matches a wildcard against subdomains only', () => {
		expect(allowsHost(['*.a.test'], 'x.a.test')).toBe(true);
		expect(allowsHost(['*.a.test'], 'a.test')).toBe(false);
		expect(allowsHost(['*.a.test'], 'xa.test')).toBe(false);
	});
});

describe('credential hosts of a frozen version', () => {
	const frozenEcho = defineNode({
		id: 'echo',
		displayName: 'Echo',
		credential: credential({ types: [compat('echoApi')] }),
		baseUrl: 'https://api.echo.test/v1',
	});
	const frozenGet = frozenEcho.action('get', {
		action: 'Get',
		summary: 'Get one record.',
		flow: { effect: 'read', cardinality: 'per-item' },
		input: {},
		output,
		async run({ http }) {
			await http.request({ path: path`/x` });
			return { ok: 'yes' };
		},
	});
	const none = { allowedHttpRequestDomains: 'none' };

	const manifestWith = (hosts: string[]): CredentialManifest => ({
		kind: 'credential',
		id: 'echo.token',
		name: 'echoApi',
		semver: '1.0.0',
		nodeContract: '2.5.0',
		sdk: '0.0.0',
		displayName: 'Echo',
		fields: t.obj({}).json,
		scheme: { kind: 'none' },
		hosts,
	});

	it('come from the credential manifest of the type', async () => {
		const before = hostOf({ credentialType: 'echoApi', data: none });
		await expect(executorOf(frozenGet)(before.host)).rejects.toThrow(
			'This credential is configured to prevent use within an Echo node',
		);

		const allowed = await withCredentialHostsOf(frozenGet, async () =>
			manifestWith(['api.echo.test']),
		);
		const { host, sent } = hostOf({ credentialType: 'echoApi', data: none });
		await executorOf(allowed)(host);
		expect(sent.map(({ url }) => url)).toEqual(['https://api.echo.test/v1/x']);

		const moved = await withCredentialHostsOf(frozenGet, async () =>
			manifestWith(['api.moved.test']),
		);
		const after = hostOf({ credentialType: 'echoApi', data: none });
		await expect(executorOf(moved)(after.host)).rejects.toThrow('api.echo.test');
		expect(after.sent).toEqual([]);
	});

	it('come from the credential manifests that the host sets', async () => {
		setCredentialManifests(async (name) =>
			name === 'echoApi' ? manifestWith(['api.host.test']) : undefined,
		);
		try {
			const types = (await withCredentialHostsOf(frozenGet)).node.credential?.types;
			expect(types?.[0]?.hosts).toEqual(['api.host.test']);
		} finally {
			setCredentialManifests(async () => undefined);
		}
	});

	it('stay the frozen ones for a type without a credential manifest', async () => {
		const kept = await withCredentialHostsOf(sender([]), async () => undefined);
		expect(kept.node.credential?.types[0]?.hosts).toEqual(['api.echo.test']);
	});
});

describe('egress in the contract', () => {
	const contract = toContract(fetchUrl);
	const withHosts = (hosts: string[]) => ({
		...contract,
		egress: { ...contract.egress, hosts: [...(contract.egress?.hosts ?? []), ...hosts] },
	});

	it('is part of the contract document and of the hash, with the node base URL host', () => {
		expect(contract.egress).toEqual({ hosts: ['api.echo.test'], fromInput: 'url' });
		expect(toContract(sender([])).egress).toEqual({ hosts: ['api.echo.test'] });
		expect(contractHash(withHosts(['b.test', 'a.test']))).toBe(
			contractHash(withHosts(['a.test', 'b.test'])),
		);
		expect(contractHash(withHosts(['a.test']))).not.toBe(contractHash(contract));
	});

	it('is a major change when a host is added and a minor change when one is removed', () => {
		expect(diffContracts(contract, withHosts(['a.test'])).kind).toBe('major');
		expect(diffContracts(withHosts(['a.test']), contract).kind).toBe('minor');
		const { egress: _, ...undeclared } = contract;
		expect(diffContracts(undeclared, contract).kind).toBe('major');
		expect(diffContracts(contract, undeclared).changes).toEqual([
			{ kind: 'minor', text: 'egress api.echo.test removed' },
			{ kind: 'minor', text: 'egress the host of input.url removed' },
		]);
	});

	it('lints a host that is not a host and a fromInput without its input field', () => {
		expect(lintContract(withHosts(['*', '{region}.api.test']))).toEqual([
			'echo.fetch: egress host * is not a host. Use api.example.com or *.example.com.',
		]);
		expect(lintContract({ ...contract, egress: { fromInput: 'link' } })).toEqual([
			'echo.fetch: egress.fromInput names no input field: link',
		]);
	});

	it('shows the hosts in the generated node module', () => {
		const text = generateNodeModule('echo', [
			{ contract, nodeType: 'echoFetch', operation: 'fetch' },
		]);
		expect(text).toContain('read, per-item; hosts: api.echo.test, the host of url');
	});
});

describe('permissionsOf', () => {
	const none: ContractDocument = { ...toContract(sender([])), credentials: [], egress: undefined };
	const nothing: ContractPermissions = {
		egress: { hosts: [], templates: [], fromCredential: [] },
		credentials: [],
		imports: [],
		binary: false,
		supplied: [],
		limits: { maxRequests: 10_000, maxItems: 1_000_000 },
	};
	const supplies = t.obj({
		model: provider.input('chatModel'),
		tools: t.arr(provider.input('tool')),
		prompt: t.str(),
	}).json;
	const slackApi = compat('slackApi', { hosts: ['slack.com'] });

	it.each<[string, ContractDocument, readonly AnyCredentialType[], Partial<ContractPermissions>]>([
		['no permission', none, [], {}],
		[
			'data tables',
			{ ...none, imports: ['inputOf', 'dataTables'] },
			[],
			{ imports: ['dataTables', 'inputOf'] },
		],
		['wait', { ...none, imports: ['wait'] }, [], { imports: ['wait'] }],
		['code', { ...none, imports: ['code'] }, [], { imports: ['code'] }],
		['supplies only', { ...none, input: supplies }, [], { supplied: ['chatModel', 'tool'] }],
		[
			'credential and base URL hosts',
			{
				...none,
				credentials: ['slackApi', 'serverApi'],
				scopes: ['files:write', 'chat:write'],
				egress: { hosts: ['{region}.region.echo.test', 'files.slack.com'] },
			},
			[slackApi, serverApi, echoApi],
			{
				egress: {
					hosts: ['files.slack.com', 'slack.com'],
					templates: ['{region}.region.echo.test'],
					fromCredential: ['serverApi'],
				},
				credentials: ['serverApi', 'slackApi'],
				scopes: ['chat:write', 'files:write'],
			},
		],
		[
			'each host from input',
			{ ...none, credentials: ['httpHeaderAuth'], egress: { fromInput: 'url' } },
			[headerAuth],
			{
				egress: { hosts: [], templates: [], fromInput: 'url', fromCredential: [] },
				credentials: ['httpHeaderAuth'],
			},
		],
	])('reads the permissions of an action with %s', (_class, contract, types, expected) => {
		expect(permissionsOf(contract, types)).toEqual({ ...nothing, ...expected });
	});

	it('reads binary fields and the limits of the host', () => {
		const binary = { ...none, input: t.obj({ file: t.binary() }).json };
		expect(permissionsOf(binary, [], { maxRequests: 5 })).toEqual({
			...nothing,
			binary: true,
			limits: { maxRequests: 5, maxItems: 1_000_000 },
		});
	});

	it('reads the hosts of a credential base URL for each option value', () => {
		const regional = compat('regionalApi', {
			fields: { region: t.oneOf('eu', 'us') },
			baseUrl: { on: 'region', values: { eu: 'https://eu.api.test', us: 'https://us.api.test' } },
		});
		expect(permissionsOf({ ...none, credentials: ['regionalApi'] }, [regional]).egress).toEqual({
			hosts: ['eu.api.test', 'us.api.test'],
			templates: [],
			fromCredential: [],
		});
	});
});

describe('egressIssuesOf', () => {
	const credentialHosts = { name: 'Header account', hosts: ['allowed.test'] };

	it('fails a static host outside the credential hosts and names host and credential', () => {
		expect(
			egressIssuesOf({ fromInput: 'url' }, { url: 'https://other.test/x' }, credentialHosts),
		).toEqual({
			errors: [
				'other.test is not an allowed host of the credential "Header account". Its hosts are: allowed.test',
			],
			warnings: [],
		});
		expect(
			egressIssuesOf({ fromInput: 'url' }, { url: 'https://allowed.test/x' }, credentialHosts),
		).toEqual({ errors: [], warnings: [] });
	});

	it('warns for an expression, which the host checks at run time', () => {
		const issues = egressIssuesOf(
			{ fromInput: 'url' },
			{ url: '={{ $json.url }}' },
			credentialHosts,
		);
		expect(issues.errors).toEqual([]);
		expect(issues.warnings).toEqual([
			'url is an expression, so n8n checks its host at run time against the hosts of the credential "Header account": allowed.test',
		]);
	});

	it('checks a host template with static fields', () => {
		const egress = { hosts: ['{region}.region.echo.test'] };
		expect(egressIssuesOf(egress, { region: 'eu' }, credentialHosts).errors).toEqual([
			'eu.region.echo.test is not an allowed host of the credential "Header account". Its hosts are: allowed.test',
		]);
		expect(
			egressIssuesOf(egress, { region: '={{ $json.r }}' }, credentialHosts).warnings,
		).toHaveLength(1);
	});
});
