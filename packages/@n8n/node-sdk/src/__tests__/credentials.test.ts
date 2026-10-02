import type { ICredentialType, IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import {
	compat,
	credentialDataOf,
	credentialType,
	discoverOidc,
	oneOf,
	str,
	t,
	toCredentialType,
	type AnyCredentialType,
} from '../index';
import { credentialBaseUrlOf, secretRedactorOf } from '../credentials';

const projected = (type: AnyCredentialType): ICredentialType => {
	const result = toCredentialType(type);
	if (!result) throw new Error('no projection');
	return result;
};

const sign = async (type: AnyCredentialType, data: object, request: IHttpRequestOptions) => {
	const { authenticate } = projected(type);
	if (typeof authenticate !== 'function') throw new Error('not a function');
	return await authenticate({ ...data }, request);
};

describe('credentialType', () => {
	it('projects placements to a generic block', () => {
		const zendesk = credentialType({
			id: 'zendesk.token',
			legacyName: 'zendeskApi',
			displayName: 'Zendesk API',
			docs: 'zendesk',
			fields: {
				subdomain: t
					.text('Subdomain')
					.describe('Your subdomain')
					.with({ examples: ['company'] }),
				email: t.text('Email'),
				apiToken: t.secret('API Token'),
			},
			baseUrl: 'https://{subdomain}.zendesk.com/api/v2',
			auth: (a) => a.basic('{email}/token', '{apiToken}'),
			test: { get: '/ticket_fields.json' },
		});
		expect(zendesk.id).toBe('zendesk.token');
		expect(projected(zendesk)).toEqual({
			name: 'zendeskApi',
			displayName: 'Zendesk API',
			documentationUrl: 'zendesk',
			properties: [
				{
					displayName: 'Subdomain',
					name: 'subdomain',
					type: 'string',
					required: true,
					description: 'Your subdomain',
					placeholder: 'company',
					default: '',
				},
				{ displayName: 'Email', name: 'email', type: 'string', required: true, default: '' },
				{
					displayName: 'API Token',
					name: 'apiToken',
					type: 'string',
					required: true,
					typeOptions: { password: true },
					default: '',
				},
			],
			authenticate: {
				type: 'generic',
				properties: {
					auth: {
						username: '={{$credentials.email}}/token',
						password: '={{$credentials.apiToken}}',
					},
				},
			},
			test: {
				request: {
					baseURL: '=https://{{$credentials.subdomain}}.zendesk.com/api/v2',
					url: '/ticket_fields.json',
				},
			},
		});
	});

	it('projects bearer, header and query to generic entries', () => {
		const multi = credentialType({
			id: 'multi.token',
			displayName: 'Multi',
			fields: { token: t.secret('Token'), key: t.secret('Key') },
			auth: (a) =>
				a.apply({ headers: { Authorization: 'Bearer {token}' }, query: { key: '{key}' } }),
		});
		expect(projected(multi).name).toBe('multi.token');
		expect(projected(multi).authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: { Authorization: '=Bearer {{$credentials.token}}' },
				qs: { key: '={{$credentials.key}}' },
			},
		});
	});

	it('generates a function for defaults that keeps request headers and the input', async () => {
		const versioned = credentialType({
			id: 'versioned.token',
			displayName: 'Versioned',
			fields: { apiKey: t.secret('API Key') },
			auth: (a) => a.bearer('apiKey', { defaults: { 'Api-Version': '2022-02-22' } }),
		});
		const request = {
			url: 'https://x.test',
			headers: { 'api-version': '2026', Authorization: 'x' },
		};
		expect(await sign(versioned, { apiKey: 'k' }, request)).toEqual({
			url: 'https://x.test',
			headers: { 'api-version': '2026', Authorization: 'Bearer k' },
		});
		expect(request.headers.Authorization).toBe('x');
		expect(await sign(versioned, { apiKey: 'k' }, { url: 'https://x.test' })).toEqual({
			url: 'https://x.test',
			headers: { Authorization: 'Bearer k', 'Api-Version': '2022-02-22' },
		});
	});

	it('drops the entry of an empty optional field', async () => {
		const keys = credentialType({
			id: 'keys.apiKey',
			displayName: 'Keys',
			fields: { apiKey: t.secret('API Key'), appKey: t.secret('APP Key').optional() },
			auth: (a) => a.apply({ headers: { 'X-Api': '{apiKey}', 'X-App': '{appKey}' } }),
		});
		expect(await sign(keys, { apiKey: 'k', appKey: '' }, { url: 'https://x.test' })).toEqual({
			url: 'https://x.test',
			headers: { 'X-Api': 'k' },
		});
		expect(await sign(keys, { apiKey: 'k', appKey: 'p' }, { url: 'https://x.test' })).toEqual({
			url: 'https://x.test',
			headers: { 'X-Api': 'k', 'X-App': 'p' },
		});
	});

	it('picks the placement of an options field', async () => {
		const switched = credentialType({
			id: 'switched.apiKey',
			displayName: 'Switched',
			fields: { mode: oneOf('header', 'query').default('header'), key: t.secret('Key') },
			auth: (a) =>
				a.when('mode', { header: a.header('X-Key', '{key}'), query: a.query('key', '{key}') }),
		});
		expect(await sign(switched, { key: 'k' }, { url: 'https://x.test' })).toEqual({
			url: 'https://x.test',
			headers: { 'X-Key': 'k' },
		});
		expect(await sign(switched, { key: 'k', mode: 'query' }, { url: 'https://x.test' })).toEqual({
			url: 'https://x.test',
			qs: { key: 'k' },
		});
	});

	it('projects the OAuth2 grants to oAuth2Api children with PKCE on by default', () => {
		const code = credentialType({
			id: 'acme.oauth2',
			legacyName: 'acmeOAuth2Api',
			displayName: 'Acme OAuth2 API',
			auth: (a) =>
				a.oauth2.authorizationCode({
					authorizationEndpoint: 'https://acme.test/authorize',
					tokenEndpoint: 'https://acme.test/token',
					scope: ['read', 'write'],
					clientAuth: 'client_secret_post',
					authorizationQuery: { access_type: 'offline', prompt: 'consent' },
				}),
		});
		expect(projected(code)).toEqual({
			name: 'acmeOAuth2Api',
			displayName: 'Acme OAuth2 API',
			extends: ['oAuth2Api'],
			properties: [
				{ displayName: 'Grant Type', name: 'grantType', type: 'hidden', default: 'pkce' },
				{
					displayName: 'Authorization URL',
					name: 'authUrl',
					type: 'hidden',
					default: 'https://acme.test/authorize',
					required: true,
				},
				{
					displayName: 'Access Token URL',
					name: 'accessTokenUrl',
					type: 'hidden',
					default: 'https://acme.test/token',
					required: true,
				},
				{ displayName: 'Scope', name: 'scope', type: 'hidden', default: 'read write' },
				{
					displayName: 'Auth URI Query Parameters',
					name: 'authQueryParameters',
					type: 'hidden',
					default: 'access_type=offline&prompt=consent',
				},
				{ displayName: 'Authentication', name: 'authentication', type: 'hidden', default: 'body' },
			],
		});
		const machine = credentialType({
			id: 'acme.clientCredentials',
			displayName: 'Acme machine',
			auth: (a) => a.oauth2.clientCredentials({ tokenEndpoint: 'https://acme.test/token' }),
		});
		expect(projected(machine).properties.map(({ name, default: value }) => [name, value])).toEqual([
			['grantType', 'clientCredentials'],
			['accessTokenUrl', 'https://acme.test/token'],
			['scope', ''],
			['authentication', 'header'],
		]);
	});

	it('refuses what tsc cannot check in plain JavaScript', () => {
		const loose: { reason: string } = { reason: ' ' };
		expect(() =>
			credentialType({
				id: 'loose.custom',
				displayName: 'Loose',
				auth: (a) =>
					a.custom({ ...loose, sign: async (_data, request) => await Promise.resolve(request) }),
			}),
		).toThrow('custom needs a reason');
		expect(() =>
			credentialType({
				id: 'loose.token',
				displayName: 'Loose',
				hosts: ['https://x.test'],
				auth: (a) => a.apply({}),
				test: { get: '/me' },
			}),
		).toThrow(
			'https://x.test is not a host. Use api.example.com or *.example.com.; test needs a baseUrl',
		);
	});
});

describe('credential tests, hidden fields, notices and user headers', () => {
	it('projects failWhen to responseSuccessBody rules and keeps status errors when asked', () => {
		const chat = credentialType({
			id: 'chat.token',
			displayName: 'Chat',
			fields: { token: t.secret('Token') },
			baseUrl: 'https://chat.test/api',
			auth: (a) => a.bearer('token'),
			test: {
				get: '/files?purpose=check',
				headers: { 'Api-Version': '1' },
				ignoreHttpStatusErrors: true,
				failWhen: [
					{ body: { error: 'invalid_auth' }, message: 'Invalid token' },
					{ body: { base_resp: { status_code: 1004 } }, message: 'Wrong region' },
				],
			},
		});
		expect(projected(chat).test).toEqual({
			request: {
				baseURL: 'https://chat.test/api',
				url: '/files?purpose=check',
				headers: { 'Api-Version': '1' },
				ignoreHttpStatusErrors: true,
			},
			rules: [
				{
					type: 'responseSuccessBody',
					properties: { key: 'error', value: 'invalid_auth', message: 'Invalid token' },
				},
				{
					type: 'responseSuccessBody',
					properties: { key: 'base_resp.status_code', value: 1004, message: 'Wrong region' },
				},
			],
		});
	});

	it('projects a POST test with a body, and a fields-only type without authenticate', () => {
		const app = credentialType({
			id: 'meta.app',
			displayName: 'App',
			fields: { clientId: t.text('Client ID'), clientSecret: t.secret('Client Secret') },
			baseUrl: 'https://graph.test/v1',
			auth: (a) => a.none(),
			test: {
				post: '/oauth/access_token',
				body: { client_id: '{clientId}', grant_type: 'client_credentials' },
			},
		});
		const type = projected(app);
		expect(type.authenticate).toBeUndefined();
		expect(type.test).toEqual({
			request: {
				baseURL: 'https://graph.test/v1',
				url: '/oauth/access_token',
				method: 'POST',
				body: { client_id: '={{$credentials.clientId}}', grant_type: 'client_credentials' },
			},
		});
	});

	it('projects hidden fields, a base URL field, option labels and a notice', () => {
		const regional = credentialType({
			id: 'regional.apiKey',
			displayName: 'Regional',
			fields: {
				apiKey: t.secret('API Key'),
				region: t
					.options('Region', {
						eu: { name: 'Europe', description: 'eu.api.test' },
						us: { name: 'United States' },
					})
					.default('eu'),
				url: t.baseUrl(),
				appId: t.hidden('App ID'),
				secret: t.secret('Signing Secret').optional().hint('Only for webhooks'),
			},
			baseUrl: { on: 'region', values: { eu: 'https://eu.api.test', us: 'https://us.api.test' } },
			auth: (a) => a.bearer('apiKey'),
			notice: { text: 'Set a signing secret', when: { secret: '' } },
		});
		expect(projected(regional).properties.slice(1)).toEqual([
			{
				displayName: 'Region',
				name: 'region',
				type: 'options',
				options: [
					{ name: 'Europe', value: 'eu', description: 'eu.api.test' },
					{ name: 'United States', value: 'us' },
				],
				default: 'eu',
				required: true,
			},
			{
				displayName: 'Base URL',
				name: 'url',
				type: 'hidden',
				default: '={{ {"eu":"https://eu.api.test","us":"https://us.api.test"}[$self.region] }}',
			},
			{ displayName: 'App ID', name: 'appId', type: 'hidden', default: '' },
			{
				displayName: 'Signing Secret',
				name: 'secret',
				type: 'string',
				hint: 'Only for webhooks',
				typeOptions: { password: true },
				default: '',
			},
			{
				displayName: 'Set a signing secret',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: { show: { secret: [''] } },
			},
		]);
		const constant = credentialType({
			id: 'constant.apiKey',
			displayName: 'Constant',
			fields: { apiKey: t.secret('API Key'), url: t.baseUrl() },
			baseUrl: 'https://api.constant.test/v1',
			auth: (a) => a.bearer('apiKey'),
		});
		expect(projected(constant).properties[1]).toEqual({
			displayName: 'Base URL',
			name: 'url',
			type: 'hidden',
			default: 'https://api.constant.test/v1',
		});
	});

	it('adds the user header fields and sends the header only when it is on', async () => {
		const proxied = credentialType({
			id: 'proxied.apiKey',
			displayName: 'Proxied',
			fields: { apiKey: t.secret('API Key') },
			auth: (a) => a.apply({ headers: { 'x-api-key': '{apiKey}' }, userHeader: true }),
		});
		expect(projected(proxied).properties.map(({ name }) => name)).toEqual([
			'apiKey',
			'header',
			'headerName',
			'headerValue',
		]);
		expect(projected(proxied).properties[3]).toMatchObject({
			typeOptions: { password: true, ignoreCredentialExpressionResolveError: true },
			displayOptions: { show: { header: [true] } },
		});
		const request = { url: 'https://x.test', headers: { 'X-Gateway': 'node', Accept: '*/*' } };
		const data = { apiKey: 'k', headerName: 'x-gateway', headerValue: 'g-1' };
		expect(await sign(proxied, { ...data, header: false }, request)).toEqual({
			url: 'https://x.test',
			headers: { 'X-Gateway': 'node', Accept: '*/*', 'x-api-key': 'k' },
		});
		expect(await sign(proxied, { ...data, header: true }, request)).toEqual({
			url: 'https://x.test',
			headers: { Accept: '*/*', 'x-api-key': 'k', 'x-gateway': 'g-1' },
		});
		expect(
			await sign(proxied, { ...data, header: true, headerName: 'X-API-KEY' }, request),
		).toEqual({
			url: 'https://x.test',
			headers: { 'X-Gateway': 'node', Accept: '*/*', 'X-API-KEY': 'g-1' },
		});
	});

	it('refuses test rules, base URL fields and user headers that cannot work', () => {
		const rule = { body: { error: { type: 'x', code: 1 } }, message: 'm' };
		expect(() =>
			credentialType({
				id: 'loose.token',
				displayName: 'Loose',
				fields: { token: t.secret('Token'), url: t.baseUrl() },
				auth: (a) => a.bearer('token'),
			}),
		).toThrow('a base URL field needs a baseUrl');
		expect(() =>
			credentialType({
				id: 'loose.token',
				displayName: 'Loose',
				fields: { token: t.secret('Token'), url: t.baseUrl() },
				baseUrl: '{url}',
				auth: (a) => a.apply({ headers: { 'X-Key': '{token}' }, userHeader: true }),
				test: { get: '//other.test/me', failWhen: [rule, { body: { 'a.b': 1 }, message: 'm' }] },
			}),
		).toThrow(
			'Credential loose.token: baseUrl: {url} is not a field, or a secret; ' +
				'test: //other.test/me must be a path without {field}; ' +
				'failWhen: each body names one value; failWhen: the key a.b has a . or a bracket',
		);
		expect(() =>
			credentialType({
				id: 'loose.token',
				displayName: 'Loose',
				fields: { token: t.secret('Token'), header: t.text('Header') },
				auth: (a) => a.apply({ headers: { 'X-Key': '{token}' }, userHeader: true }),
			}),
		).toThrow('userHeader: header is a field of userHeader');
	});
});

describe('credentialBaseUrlOf', () => {
	const server = compat('serverApi', {
		fields: { server: t.url('Server').default('https://api.server.test'), team: str().optional() },
		baseUrl: '{server}/teams/{team}',
	});
	const tenant = compat('tenantApi', {
		fields: { tenant: t.text('Tenant') },
		baseUrl: 'https://{tenant}.example.test/v1',
	});

	it('fills a URL field, a host label and a path segment', () => {
		expect(credentialBaseUrlOf(server, { server: 'https://gh.test', team: 'a b' })).toBe(
			'https://gh.test/teams/a%20b',
		);
		expect(credentialBaseUrlOf(server, { server: '', team: 'x' })).toBe(
			'https://api.server.test/teams/x',
		);
		expect(credentialBaseUrlOf(tenant, { tenant: 'acme' })).toBe('https://acme.example.test/v1');
	});

	it('picks the base URL of an options value and trims a URL value', () => {
		const regional = compat('regionalApi', {
			fields: { region: oneOf('eu', 'us').default('eu') },
			baseUrl: { on: 'region', values: { eu: 'https://eu.api.test', us: 'https://us.api.test' } },
		});
		expect(credentialBaseUrlOf(regional, {})).toBe('https://eu.api.test');
		expect(credentialBaseUrlOf(regional, { region: 'us' })).toBe('https://us.api.test');
		expect(credentialBaseUrlOf(server, { server: 'https://gh.test//', team: 'x' })).toBe(
			'https://gh.test/teams/x',
		);
	});

	it('refuses a host value that is not one label', () => {
		expect(() => credentialBaseUrlOf(tenant, { tenant: 'evil.test/x?' })).toThrow(
			'tenant must be one host label',
		);
	});
});

describe('credential types in tsc', () => {
	// The probes only need to compile; the definition checks would throw at run time.
	const probes = () => {
		const fields = { apiKey: t.secret('API Key'), region: oneOf('eu', 'us').default('eu') };
		credentialType({
			id: 'probe.token',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `apiKy` is not a field
			auth: (a) => a.bearer('apiKy'),
		});
		credentialType({
			id: 'probe.token',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `{apiKy}` is not a field
			auth: (a) => a.header('X-Key', '{apiKy}'),
		});
		credentialType({
			id: 'probe.custom',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `custom` needs a reason
			auth: (a) => a.custom({ sign: async (_data, request) => await Promise.resolve(request) }),
		});
		credentialType({
			id: 'probe.token',
			displayName: 'Probe',
			fields,
			// @ts-expect-error a secret never goes into a URL
			baseUrl: 'https://{apiKey}.example.test',
			auth: (a) => a.bearer('apiKey'),
		});
		credentialType({
			id: 'probe.token',
			displayName: 'Probe',
			fields,
			// @ts-expect-error each value of `region` needs a case
			auth: (a) => a.when('region', { eu: a.bearer('apiKey') }),
		});
		credentialType({
			id: 'probe.token',
			displayName: 'Probe',
			fields,
			auth: (a) => a.bearer('apiKey'),
			// @ts-expect-error the test path starts with "/"
			test: { get: 'https://other.test/me' },
		});
		credentialType({
			id: 'probe.token',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `{nope}` is not a field
			auth: (a) => a.apply({ headers: { 'X-Key': '{apiKey}' }, defaults: { 'X-Other': '{nope}' } }),
		});
		credentialType({
			id: 'probe.token',
			displayName: 'Probe',
			fields,
			baseUrl: 'https://api.probe.test',
			auth: (a) => a.none(),
			// @ts-expect-error `{clientId}` is not a field
			test: { post: '/token', body: { client_id: '{clientId}' } },
		});
		credentialType({
			id: 'probe.token',
			displayName: 'Probe',
			fields,
			auth: (a) => a.bearer('apiKey'),
			// @ts-expect-error `regoin` is not a field
			notice: { text: 'Pick a region', when: { regoin: 'eu' } },
		});
		compat('probeApi', {
			fields,
			// @ts-expect-error each value of `region` needs a base URL
			baseUrl: { on: 'region', values: { eu: 'https://eu.api.test' } },
		});
		// @ts-expect-error the id is `service.scheme`
		credentialType({ id: 'probe', displayName: 'Probe', auth: (a) => a.apply({}) });
		credentialType({
			id: 'probe.token',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `{$token}` exists only in `exchange`
			auth: (a) => a.header('X-Session', '{$token}'),
		});
		credentialType({
			id: 'probe.session',
			displayName: 'Probe',
			fields,
			auth: (a) =>
				a.exchange({
					// @ts-expect-error a secret never goes into a URL
					post: 'https://{apiKey}.probe.test/login',
					token: { path: 'id' },
					headers: { 'X-Session': '{$token}' },
				}),
		});
		credentialType({
			id: 'probe.session',
			displayName: 'Probe',
			fields,
			auth: (a) =>
				a.exchange({
					post: 'https://probe.test/login',
					token: { path: 'id' },
					// @ts-expect-error `{$scopes}` exists only in `jwtBearer` claims
					headers: { 'X-Session': '{$scopes}' },
				}),
		});
		credentialType({
			id: 'probe.serviceAccount',
			displayName: 'Probe',
			fields,
			auth: (a) =>
				a.oauth2.jwtBearer({
					tokenEndpoint: 'https://probe.test/token',
					// @ts-expect-error the key is a secret field
					key: 'region',
					// @ts-expect-error a claim never holds a secret
					claims: { sub: '{apiKey}' },
				}),
		});
		credentialType({
			id: 'probe.oauth2',
			displayName: 'Probe',
			fields,
			auth: (a) =>
				a.oauth2.authorizationCode({
					// @ts-expect-error an endpoint is https or starts with a field
					authorizationEndpoint: 'http://probe.test/authorize',
					tokenEndpoint: 'https://probe.test/token',
				}),
		});
	};

	it('rejects typos, a missing reason and a secret in the base URL', () => {
		expect(probes).toBeTypeOf('function');
	});
});

const metabase = credentialType({
	id: 'metabase.session',
	legacyName: 'metabaseApi',
	displayName: 'Metabase API',
	fields: { url: t.url('URL'), username: t.text('Username'), password: t.secret('Password') },
	baseUrl: '{url}',
	auth: (a) =>
		a.exchange({
			post: '{url}/api/session',
			json: { username: '{username}', password: '{password}' },
			token: { path: 'id', field: 'sessionToken' },
			headers: { 'X-Metabase-Session': '{$token}' },
		}),
	test: { get: '/api/user/current' },
});

/** A request helper that answers each token request with `reply` and records it. */
const tokenHelper = (reply: () => unknown) => {
	const sent: IHttpRequestOptions[] = [];
	const helper = {
		helpers: {
			httpRequest: async (options: IHttpRequestOptions) => {
				sent.push(options);
				return await Promise.resolve(reply());
			},
		},
	} as IHttpRequestHelper;
	return { helper, sent };
};

const preAuthenticate = async (type: ICredentialType, helper: IHttpRequestHelper, data: object) => {
	if (!type.preAuthentication) throw new Error('no preAuthentication');
	return await type.preAuthentication.call(helper, { ...data });
};

describe('exchange', () => {
	const data = { url: 'https://metabase.acme.test/', username: 'ada', password: 'pw-1' };

	it('projects a hidden token field, a token request, and a generic block for the token', () => {
		const type = projected(metabase);
		expect(type.properties[0]).toEqual({
			displayName: 'Token',
			name: 'sessionToken',
			type: 'hidden',
			default: '',
			typeOptions: { expirable: true, password: true },
		});
		expect(type.authenticate).toEqual({
			type: 'generic',
			properties: { headers: { 'X-Metabase-Session': '={{$credentials.sessionToken}}' } },
		});
		expect(typeof type.preAuthentication).toBe('function');
	});

	it('sends the token request to the credential host and reads the token', async () => {
		const { helper, sent } = tokenHelper(() => ({ id: 'session-1' }));
		expect(await preAuthenticate(projected(metabase), helper, data)).toEqual({
			sessionToken: 'session-1',
		});
		expect(sent).toEqual([
			{
				method: 'POST',
				url: 'https://metabase.acme.test/api/session',
				body: { username: 'ada', password: 'pw-1' },
				json: true,
				allowedDomains: 'metabase.acme.test',
			},
		]);
	});

	it('stores the expiry of the token when the response has one', async () => {
		const expiring = credentialType({
			id: 'acme.session',
			displayName: 'Acme',
			fields: { key: t.secret('Key') },
			baseUrl: 'https://api.acme.test',
			auth: (a) =>
				a.exchange({
					post: 'https://api.acme.test/login',
					json: { key: '{key}' },
					token: { path: 'data.token', expiresIn: 'data.expires_in' },
					headers: { Authorization: 'Bearer {$token}' },
				}),
		});
		const type = projected(expiring);
		expect(type.properties.map(({ name }) => name)).toEqual(['token', 'n8n_expires_at', 'key']);
		const { helper } = tokenHelper(() => ({ data: { token: 't-1', expires_in: 60 } }));
		const before = Date.now();
		const output = await preAuthenticate(type, helper, { key: 'k-1' });
		expect(output.token).toBe('t-1');
		expect(Number(output.n8n_expires_at)).toBeGreaterThanOrEqual(before + 60_000);
		const unknown = tokenHelper(() => ({ data: { token: 't-2' } }));
		expect(await preAuthenticate(type, unknown.helper, { key: 'k-1' })).toEqual({
			token: 't-2',
			n8n_expires_at: '',
		});
	});

	it('refuses a token host that is not a credential host, and redacts a failed request', async () => {
		const elsewhere = credentialType({
			id: 'acme.session',
			displayName: 'Acme',
			fields: { key: t.secret('Key') },
			baseUrl: 'https://api.acme.test',
			auth: (a) =>
				a.exchange({
					post: 'https://login.other.test/session',
					json: { key: '{key}' },
					token: { path: 'token' },
					headers: { 'X-Session': '{$token}' },
				}),
		});
		const { helper, sent } = tokenHelper(() => ({ token: 't' }));
		await expect(preAuthenticate(projected(elsewhere), helper, { key: 'k' })).rejects.toThrow(
			'the token request goes to login.other.test',
		);
		expect(sent).toEqual([]);

		const failing = {
			helpers: {
				httpRequest: async () => await Promise.reject(new Error('401: bad password pw-1')),
			},
		} as unknown as IHttpRequestHelper;
		await expect(preAuthenticate(projected(metabase), failing, data)).rejects.toThrow(
			'Credential metabaseApi: the token request failed: 401: bad password [REDACTED]',
		);
		const empty = tokenHelper(() => ({}));
		await expect(preAuthenticate(projected(metabase), empty.helper, data)).rejects.toThrow(
			'the token response has no id',
		);
	});

	it('refuses an exchange without {$token}, with a field as the token field, or an unknown field', () => {
		const exchange = (spec: object) => () =>
			credentialType({
				id: 'acme.session',
				displayName: 'Acme',
				fields: { key: t.secret('Key') },
				hosts: ['api.acme.test'],
				// Plain JavaScript: tsc does not check the spec.
				auth: (a) =>
					a.exchange({
						post: 'https://api.acme.test/login',
						token: { path: 'token' },
						...spec,
					} as never),
			});
		expect(exchange({ headers: { 'X-Session': 'none' } })).toThrow('exchange: no {$token}');
		expect(
			exchange({ token: { path: 'token', field: 'key' }, headers: { 'X-S': '{$token}' } }),
		).toThrow('exchange: key must be a new field name');
		expect(exchange({ json: { key: '{nope}' }, headers: { 'X-S': '{$token}' } })).toThrow(
			'exchange.json: {nope} is not a field',
		);
		expect(exchange({ token: { path: 'a..b' }, headers: { 'X-S': '{$token}' } })).toThrow(
			'exchange: a..b is not a dot path',
		);
		expect(() =>
			credentialType({
				id: 'acme.session',
				displayName: 'Acme',
				auth: (a) =>
					a.exchange({
						post: 'https://api.acme.test/login',
						token: { path: 'token' },
						headers: { 'X-Session': '{$token}' },
					}),
			}),
		).toThrow('exchange needs a baseUrl or hosts');
	});
});

describe('OAuth2 grants and OIDC', () => {
	it('projects endpoint templates over fields, editable scopes and a legacy parent', () => {
		const type = projected(
			credentialType({
				id: 'acme.oauth2',
				legacyName: 'acmeOAuth2Api',
				displayName: 'Acme OAuth2 API',
				legacyParent: 'acmeBaseOAuth2Api',
				fields: { server: t.url('Server').default('https://acme.test') },
				auth: (a) =>
					a.oauth2.authorizationCode({
						authorizationEndpoint: '{server}/oauth/authorize',
						tokenEndpoint: '{server}/oauth/token',
						scope: ['read', 'write'],
						pkce: false,
						editableScopes: true,
					}),
			}),
		);
		expect(type.extends).toEqual(['acmeBaseOAuth2Api']);
		const byName = Object.fromEntries(type.properties.map((property) => [property.name, property]));
		expect(byName.authUrl?.default).toBe('={{$self.server}}/oauth/authorize');
		expect(byName.accessTokenUrl?.default).toBe('={{$self.server}}/oauth/token');
		expect(byName.enabledScopes).toMatchObject({ type: 'string', default: 'read write' });
		expect(byName.scope?.default).toBe(
			'={{$self["customScopes"] ? $self["enabledScopes"] : "read write"}}',
		);
		expect(type.properties.map(({ name }) => name)).toEqual([
			'grantType',
			'authUrl',
			'accessTokenUrl',
			'customScopes',
			'customScopesNotice',
			'enabledScopes',
			'scope',
			'authQueryParameters',
			'authentication',
			'server',
		]);
	});

	it('keeps the grants n8n core does not run as data and refuses to project them', () => {
		const fields = { privateKey: t.secret('Private Key'), email: t.text('Email') };
		const jwt = credentialType({
			id: 'acme.serviceAccount',
			displayName: 'Acme',
			fields,
			auth: (a) =>
				a.oauth2.jwtBearer({
					tokenEndpoint: 'https://oauth2.acme.test/token',
					key: 'privateKey',
					claims: { iss: '{email}', scope: '{$scopes}' },
				}),
		});
		expect(jwt.scheme).toEqual({
			kind: 'oauth2',
			grant: 'jwtBearer',
			tokenEndpoint: 'https://oauth2.acme.test/token',
			key: 'privateKey',
			algorithm: 'RS256',
			claims: { iss: '{email}', scope: '{$scopes}' },
			scope: [],
		});
		expect(() => toCredentialType(jwt)).toThrow('n8n core does not run jwtBearer yet');
		const device = credentialType({
			id: 'acme.device',
			displayName: 'Acme',
			auth: (a) =>
				a.oauth2.deviceCode({
					deviceAuthorizationEndpoint: 'https://acme.test/device',
					tokenEndpoint: 'https://acme.test/token',
				}),
		});
		expect(() => toCredentialType(device)).toThrow('n8n core does not run deviceCode yet');
		const exchange = credentialType({
			id: 'acme.exchange',
			displayName: 'Acme',
			fields: { subject: t.secret('Subject Token') },
			auth: (a) =>
				a.oauth2.tokenExchange({
					tokenEndpoint: 'https://acme.test/token',
					subjectToken: 'subject',
					subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
					resource: 'https://api.acme.test',
				}),
		});
		expect(exchange.scheme).toMatchObject({
			grant: 'tokenExchange',
			clientAuth: 'client_secret_basic',
		});
		const oidc = credentialType({
			id: 'acme.oidc',
			displayName: 'Acme',
			fields: { tenant: t.text('Tenant') },
			auth: (a) => a.oidc({ issuer: 'https://{tenant}.acme.test', scope: ['email', 'openid'] }),
		});
		expect(oidc.scheme).toEqual({
			kind: 'oidc',
			issuer: 'https://{tenant}.acme.test',
			scope: ['openid', 'email'],
			clientAuth: 'client_secret_basic',
			pkce: true,
		});
		expect(() => toCredentialType(oidc)).toThrow('n8n core does not run oidc yet');
	});

	it('refuses a scope with a space, a claim with a secret, and a subject token that is not a secret', () => {
		const make = (auth: Parameters<typeof credentialType>[0]['auth']) => () =>
			credentialType({
				id: 'acme.oauth2',
				displayName: 'Acme',
				fields: { key: t.secret('Key'), email: t.text('Email') },
				auth,
			});
		expect(
			make((a) =>
				a.oauth2.clientCredentials({ tokenEndpoint: 'https://acme.test/token', scope: ['a b'] }),
			),
		).toThrow('scope: "a b" is not one scope token');
		for (const scope of ['a}}b', '=a', '{a']) {
			expect(
				make((a) =>
					a.oauth2.clientCredentials({ tokenEndpoint: 'https://acme.test/token', scope: [scope] }),
				),
			).toThrow(`scope: "${scope}" is not one scope token`);
		}
		expect(
			make((a) =>
				a.oauth2.jwtBearer({
					tokenEndpoint: 'https://acme.test/token',
					key: 'key',
					claims: { sub: '{key}' } as never,
				}),
			),
		).toThrow('jwtBearer: {key} is not a field or $scopes, or a secret');
		expect(
			make((a) =>
				a.oauth2.tokenExchange({
					tokenEndpoint: 'https://acme.test/token',
					subjectToken: 'email' as never,
					subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
				}),
			),
		).toThrow('tokenExchange: email is not a secret field');
		expect(
			make((a) => a.oauth2.clientCredentials({ tokenEndpoint: 'http://acme.test/token' as never })),
		).toThrow('tokenEndpoint must start with https:// or a {field}');
	});

	it('reads the endpoints from the discovery document of the issuer', async () => {
		const issuer = 'https://id.acme.test';
		const document = {
			issuer,
			authorization_endpoint: 'https://id.acme.test/authorize',
			token_endpoint: 'https://id.acme.test/token',
			jwks_uri: 'https://id.acme.test/jwks',
			userinfo_endpoint: 'https://id.acme.test/userinfo',
		};
		const asked: string[] = [];
		const get = async (url: string) => {
			asked.push(url);
			return await Promise.resolve(document);
		};
		expect(await discoverOidc(`${issuer}`, get)).toEqual({
			authorizationEndpoint: 'https://id.acme.test/authorize',
			tokenEndpoint: 'https://id.acme.test/token',
			jwksUri: 'https://id.acme.test/jwks',
			userinfoEndpoint: 'https://id.acme.test/userinfo',
		});
		expect(asked).toEqual(['https://id.acme.test/.well-known/openid-configuration']);
		const other = async () => await Promise.resolve({ ...document, issuer: 'https://evil.test' });
		await expect(discoverOidc(issuer, other)).rejects.toThrow('names another issuer');
		const plain = async () =>
			await Promise.resolve({ ...document, token_endpoint: 'http://id.acme.test/token' });
		await expect(discoverOidc(issuer, plain)).rejects.toThrow('token_endpoint');
	});
});

describe('renamed fields', () => {
	const renamed = credentialType({
		id: 'acme.token',
		displayName: 'Acme',
		fields: { accessToken: t.secret('Access Token') },
		auth: (a) => a.bearer('accessToken'),
		renamed: { token: 'accessToken' },
	});

	it('reads the value of an old field name, and n8n keeps the old field', async () => {
		expect(credentialDataOf(renamed, { token: 'old-1', accessToken: '' })).toMatchObject({
			accessToken: 'old-1',
		});
		expect(credentialDataOf(renamed, { token: 'old-1', accessToken: 'new-1' })).toMatchObject({
			accessToken: 'new-1',
		});
		expect(projected(renamed).properties.map(({ name, type }) => [name, type])).toEqual([
			['accessToken', 'string'],
			['token', 'hidden'],
		]);
		expect(
			await sign(renamed, { token: 'old-1', accessToken: '' }, { url: 'https://x.test' }),
		).toEqual({
			url: 'https://x.test',
			headers: { Authorization: 'Bearer old-1' },
		});
	});

	it('refuses an old name that is a field, or a new name that is not one', () => {
		expect(() =>
			credentialType({
				id: 'acme.token',
				displayName: 'Acme',
				fields: { accessToken: t.secret('Access Token') },
				auth: (a) => a.bearer('accessToken'),
				renamed: { accessToken: 'accessToken' },
			}),
		).toThrow('renamed: accessToken must be an old name of the field accessToken');
		expect(() =>
			credentialType({
				id: 'acme.token',
				displayName: 'Acme',
				fields: { subdomain: t.text('Subdomain'), accessToken: t.secret('Access Token') },
				baseUrl: 'https://{subdomain}.acme.test',
				auth: (a) => a.bearer('accessToken'),
				renamed: { domain: 'subdomain' },
			}),
		).toThrow('renamed: subdomain is in baseUrl, test or a URL, which do not read an old name');
	});
});

describe('secretRedactorOf', () => {
	it('removes secrets, derived tokens, base64 and URL-encoded forms, and basic pairs', () => {
		const zendesk = credentialType({
			id: 'zendesk.token',
			displayName: 'Zendesk',
			fields: { email: t.text('Email'), apiToken: t.secret('API Token') },
			auth: (a) => a.basic('{email}/token', '{apiToken}'),
		});
		const redact = secretRedactorOf(zendesk, {
			email: 'ada@acme.test',
			apiToken: 'tok/en+1',
			oauthTokenData: { access_token: 'at-123' },
		});
		const basic = Buffer.from('ada@acme.test/token:tok/en+1').toString('base64');
		expect(
			redact(`raw tok/en+1, url tok%2Fen%2B1, basic ${basic}, oauth at-123, email ada@acme.test`),
		).toBe(
			'raw [REDACTED], url [REDACTED], basic [REDACTED], oauth [REDACTED], email ada@acme.test',
		);
		expect(redact('Authorization: Bearer a-refreshed-token-value')).toBe(
			'Authorization: [REDACTED]',
		);
	});

	it('removes the client secret and the user header value, but not the header name or a short value', () => {
		const acme = credentialType({
			id: 'acme.oauth2',
			displayName: 'Acme',
			fields: { pin: t.secret('PIN').optional() },
			auth: (a) =>
				a.oauth2.clientCredentials({ tokenEndpoint: 'https://acme.test/token', scope: ['read'] }),
		});
		const redact = secretRedactorOf(acme, {
			pin: 'abc',
			clientSecret: 'client-secret-1',
			headerName: 'Authorization',
			headerValue: 'header-value-1',
		});
		expect(redact('abc client-secret-1 Authorization header-value-1')).toBe(
			'abc [REDACTED] Authorization [REDACTED]',
		);
	});

	it('removes each long unmarked value of a compat type, but not its plain fields or settings', () => {
		const github = compat('githubOAuth2Api', { fields: { server: t.url('Server') } });
		const redact = secretRedactorOf(github, {
			server: 'https://api.github.com',
			clientSecret: 'client-secret-1',
			authentication: 'header',
			pin: '1234',
		});
		expect(redact('client-secret-1 at https://api.github.com with header 1234')).toBe(
			'[REDACTED] at https://api.github.com with header 1234',
		);
	});
});
