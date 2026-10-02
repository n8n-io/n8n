import type { ICredentialType, IHttpRequestOptions } from 'n8n-workflow';

import {
	compat,
	credentialType,
	oneOf,
	str,
	t,
	toCredentialType,
	type AnyCredentialType,
} from '../index';
import { credentialBaseUrlOf } from '../credentials';

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
	};

	it('rejects typos, a missing reason and a secret in the base URL', () => {
		expect(probes).toBeTypeOf('function');
	});
});
