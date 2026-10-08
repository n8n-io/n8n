import type { ICredentialType, IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';
import { generateKeyPairSync, verify } from 'node:crypto';

import {
	compat,
	defineCredential,
	field,
	type AnyCredentialType,
	type Derived,
} from '../entry/credentials';
import { credentialTypeOfManifest, toCredentialType } from '../entry/host';
import { checkCredentialType, parseCredentialManifest } from '../entry/registry';
import { t } from '../index';
import {
	credentialBaseUrlOf,
	credentialDataOf,
	derivedOf,
	discoverOidc,
	secretRedactorOf,
	type HostHttp,
} from '../credentials';
import { credentialManifestOf } from '../manifest';

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
		const zendesk = defineCredential({
			id: 'zendesk.token',
			version: '1.0.0',
			legacyName: 'zendeskApi',
			displayName: 'Zendesk API',
			docs: 'zendesk',
			fields: {
				subdomain: field
					.text('Subdomain')
					.describe('Your subdomain')
					.with({ examples: ['company'] }),
				email: field.text('Email'),
				apiToken: field.secret('API Token'),
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
		const multi = defineCredential({
			id: 'multi.token',
			version: '1.0.0',
			displayName: 'Multi',
			fields: { token: field.secret('Token'), key: field.secret('Key') },
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
		const versioned = defineCredential({
			id: 'versioned.token',
			version: '1.0.0',
			displayName: 'Versioned',
			fields: { apiKey: field.secret('API Key') },
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
		const keys = defineCredential({
			id: 'keys.apiKey',
			version: '1.0.0',
			displayName: 'Keys',
			fields: { apiKey: field.secret('API Key'), appKey: field.secret('APP Key').optional() },
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
		const switched = defineCredential({
			id: 'switched.apiKey',
			version: '1.0.0',
			displayName: 'Switched',
			fields: { mode: t.oneOf('header', 'query').default('header'), key: field.secret('Key') },
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
		const code = defineCredential({
			id: 'acme.oauth2',
			version: '1.0.0',
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
		const machine = defineCredential({
			id: 'acme.clientCredentials',
			version: '1.0.0',
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
			defineCredential({
				id: 'loose.custom',
				version: '1.0.0',
				displayName: 'Loose',
				auth: (a) =>
					a.custom({ ...loose, sign: async (_data, request) => await Promise.resolve(request) }),
			}),
		).toThrow('custom needs a reason');
		expect(() =>
			defineCredential({
				id: 'loose.token',
				version: '1.0.0',
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
		const chat = defineCredential({
			id: 'chat.token',
			version: '1.0.0',
			displayName: 'Chat',
			fields: { token: field.secret('Token') },
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
		const app = defineCredential({
			id: 'meta.app',
			version: '1.0.0',
			displayName: 'App',
			fields: { clientId: field.text('Client ID'), clientSecret: field.secret('Client Secret') },
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
		const regional = defineCredential({
			id: 'regional.apiKey',
			version: '1.0.0',
			displayName: 'Regional',
			fields: {
				apiKey: field.secret('API Key'),
				region: field
					.options('Region', {
						eu: { name: 'Europe', description: 'eu.api.test' },
						us: { name: 'United States' },
					})
					.default('eu'),
				url: field.baseUrl(),
				appId: field.hidden('App ID'),
				secret: field.secret('Signing Secret').optional().hint('Only for webhooks'),
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
		const constant = defineCredential({
			id: 'constant.apiKey',
			version: '1.0.0',
			displayName: 'Constant',
			fields: { apiKey: field.secret('API Key'), url: field.baseUrl() },
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

	it('shows a field only while the fields of its when have these values', () => {
		const delegated = defineCredential({
			id: 'delegated.serviceAccount',
			version: '1.0.0',
			displayName: 'Delegated',
			fields: {
				privateKey: field.secret('Private Key'),
				inpersonate: t.bool().default(false).with({ title: 'Impersonate a User' }),
				delegatedEmail: field.text('Email').optional(),
			},
			auth: (a) => a.bearer('privateKey'),
			when: { delegatedEmail: { inpersonate: true } },
		});
		expect(projected(delegated).properties.at(-1)).toEqual({
			displayName: 'Email',
			name: 'delegatedEmail',
			type: 'string',
			displayOptions: { show: { inpersonate: [true] } },
			default: '',
		});
		const manifest = credentialManifestOf(delegated);
		expect(manifest).toMatchObject({
			nodeContract: '2.13.0',
			when: { delegatedEmail: { inpersonate: true } },
		});
		if (!manifest) throw new Error('no manifest');
		expect(
			credentialTypeOfManifest(parseCredentialManifest(JSON.stringify(manifest))).properties,
		).toEqual(projected(delegated).properties);
		expect(() =>
			defineCredential({
				id: 'loose.token',
				version: '1.0.0',
				displayName: 'Loose',
				fields: { token: field.secret('Token'), user: field.text('User') },
				auth: (a) => a.bearer('token'),
				// @ts-expect-error the run-time check sees what `tsc` refuses
				when: { usr: { user: 'a' }, user: { token: 'x' } },
			}),
		).toThrow('when: usr is not a field; when: token is not a field without a secret');
	});

	it('adds the user header fields and sends the header only when it is on', async () => {
		const proxied = defineCredential({
			id: 'proxied.apiKey',
			version: '1.0.0',
			displayName: 'Proxied',
			fields: { apiKey: field.secret('API Key') },
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
			defineCredential({
				id: 'loose.token',
				version: '1.0.0',
				displayName: 'Loose',
				fields: { token: field.secret('Token'), url: field.baseUrl() },
				auth: (a) => a.bearer('token'),
			}),
		).toThrow('a base URL field needs a baseUrl');
		expect(() =>
			defineCredential({
				id: 'loose.token',
				version: '1.0.0',
				displayName: 'Loose',
				fields: { token: field.secret('Token'), url: field.baseUrl() },
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
			defineCredential({
				id: 'loose.token',
				version: '1.0.0',
				displayName: 'Loose',
				fields: { token: field.secret('Token'), header: field.text('Header') },
				auth: (a) => a.apply({ headers: { 'X-Key': '{token}' }, userHeader: true }),
			}),
		).toThrow('userHeader: header is a field of userHeader');
	});
});

describe('credentialBaseUrlOf', () => {
	const server = compat('serverApi', {
		fields: {
			server: field.url('Server').default('https://api.server.test'),
			team: t.str().optional(),
		},
		baseUrl: '{server}/teams/{team}',
	});
	const tenant = compat('tenantApi', {
		fields: { tenant: field.text('Tenant') },
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
			fields: { region: t.oneOf('eu', 'us').default('eu') },
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
		const fields = { apiKey: field.secret('API Key'), region: t.oneOf('eu', 'us').default('eu') };
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `apiKy` is not a field
			auth: (a) => a.bearer('apiKy'),
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `{apiKy}` is not a field
			auth: (a) => a.header('X-Key', '{apiKy}'),
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			auth: (a) => a.bearer('apiKey'),
			// @ts-expect-error derive never reads a secret
			derive: ({ apiKey }) => ({ scope: apiKey }),
		});
		defineCredential({
			id: 'probe.custom',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `custom` needs a reason
			auth: (a) => a.custom({ sign: async (_data, request) => await Promise.resolve(request) }),
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			// @ts-expect-error a secret never goes into a URL
			baseUrl: 'https://{apiKey}.example.test',
			auth: (a) => a.bearer('apiKey'),
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			// @ts-expect-error each value of `region` needs a case
			auth: (a) => a.when('region', { eu: a.bearer('apiKey') }),
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			auth: (a) => a.bearer('apiKey'),
			// @ts-expect-error the test path starts with "/"
			test: { get: 'https://other.test/me' },
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `{nope}` is not a field
			auth: (a) => a.apply({ headers: { 'X-Key': '{apiKey}' }, defaults: { 'X-Other': '{nope}' } }),
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			baseUrl: 'https://api.probe.test',
			auth: (a) => a.none(),
			// @ts-expect-error `{clientId}` is not a field
			test: { post: '/token', body: { client_id: '{clientId}' } },
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			auth: (a) => a.bearer('apiKey'),
			// @ts-expect-error `regoin` is not a field
			notice: { text: 'Pick a region', when: { regoin: 'eu' } },
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			auth: (a) => a.bearer('apiKey'),
			// @ts-expect-error `regoin` is not a field
			when: { regoin: { region: 'eu' } },
		});
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			auth: (a) => a.bearer('apiKey'),
			// @ts-expect-error a condition names no secret field
			when: { region: { apiKey: 'x' } },
		});
		compat('probeApi', {
			fields,
			// @ts-expect-error each value of `region` needs a base URL
			baseUrl: { on: 'region', values: { eu: 'https://eu.api.test' } },
		});
		// @ts-expect-error the id is `service.scheme`
		defineCredential({ id: 'probe', displayName: 'Probe', auth: (a) => a.apply({}) });
		defineCredential({
			id: 'probe.token',
			version: '1.0.0',
			displayName: 'Probe',
			fields,
			// @ts-expect-error `{$token}` exists only in `exchange`
			auth: (a) => a.header('X-Session', '{$token}'),
		});
		defineCredential({
			id: 'probe.session',
			version: '1.0.0',
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
		defineCredential({
			id: 'probe.session',
			version: '1.0.0',
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
		defineCredential({
			id: 'probe.serviceAccount',
			version: '1.0.0',
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
		defineCredential({
			id: 'probe.oauth2',
			version: '1.0.0',
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

const metabase = defineCredential({
	id: 'metabase.session',
	version: '1.0.0',
	legacyName: 'metabaseApi',
	displayName: 'Metabase API',
	fields: {
		url: field.url('URL'),
		username: field.text('Username'),
		password: field.secret('Password'),
	},
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
		const expiring = defineCredential({
			id: 'acme.session',
			version: '1.0.0',
			displayName: 'Acme',
			fields: { key: field.secret('Key') },
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
		const elsewhere = defineCredential({
			id: 'acme.session',
			version: '1.0.0',
			displayName: 'Acme',
			fields: { key: field.secret('Key') },
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
			defineCredential({
				id: 'acme.session',
				version: '1.0.0',
				displayName: 'Acme',
				fields: { key: field.secret('Key') },
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
			defineCredential({
				id: 'acme.session',
				version: '1.0.0',
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
			defineCredential({
				id: 'acme.oauth2',
				version: '1.0.0',
				legacyName: 'acmeOAuth2Api',
				displayName: 'Acme OAuth2 API',
				legacyParent: 'acmeBaseOAuth2Api',
				fields: { server: field.url('Server').default('https://acme.test') },
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

	it('projects an endpoint field of the type in place of the hidden endpoint', () => {
		const type = projected(
			defineCredential({
				id: 'acme.oauth2',
				version: '1.0.0',
				legacyName: 'acmeOAuth2Api',
				displayName: 'Acme OAuth2 API',
				fields: {
					authUrl: field.url('Authorization URL').default('https://acme.test/authorize'),
					accessTokenUrl: field.url('Access Token URL').default('https://acme.test/token'),
				},
				auth: (a) =>
					a.oauth2.authorizationCode({
						authorizationEndpoint: 'https://acme.test/authorize',
						tokenEndpoint: 'https://acme.test/token',
					}),
			}),
		);
		const endpoints = type.properties.filter(({ name }) =>
			['authUrl', 'accessTokenUrl'].includes(name),
		);
		expect(endpoints).toEqual([
			expect.objectContaining({ name: 'authUrl', type: 'string' }),
			expect.objectContaining({ name: 'accessTokenUrl', type: 'string' }),
		]);
	});

	it('keeps the grants n8n core does not run as data and refuses to project them', () => {
		const device = defineCredential({
			id: 'acme.device',
			version: '1.0.0',
			displayName: 'Acme',
			auth: (a) =>
				a.oauth2.deviceCode({
					deviceAuthorizationEndpoint: 'https://acme.test/device',
					tokenEndpoint: 'https://acme.test/token',
				}),
		});
		expect(() => toCredentialType(device)).toThrow('n8n core does not run deviceCode yet');
		const exchange = defineCredential({
			id: 'acme.exchange',
			version: '1.0.0',
			displayName: 'Acme',
			fields: { subject: field.secret('Subject Token') },
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
		const oidc = defineCredential({
			id: 'acme.oidc',
			version: '1.0.0',
			displayName: 'Acme',
			fields: { tenant: field.text('Tenant') },
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
		const make = (auth: Parameters<typeof defineCredential>[0]['auth']) => () =>
			defineCredential({
				id: 'acme.oauth2',
				version: '1.0.0',
				displayName: 'Acme',
				fields: { key: field.secret('Key'), email: field.text('Email') },
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
	const renamed = defineCredential({
		id: 'acme.token',
		version: '1.0.0',
		displayName: 'Acme',
		fields: { accessToken: field.secret('Access Token') },
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
			defineCredential({
				id: 'acme.token',
				version: '1.0.0',
				displayName: 'Acme',
				fields: { accessToken: field.secret('Access Token') },
				auth: (a) => a.bearer('accessToken'),
				renamed: { accessToken: 'accessToken' },
			}),
		).toThrow('renamed: accessToken must be an old name of the field accessToken');
		expect(() =>
			defineCredential({
				id: 'acme.token',
				version: '1.0.0',
				displayName: 'Acme',
				fields: { subdomain: field.text('Subdomain'), accessToken: field.secret('Access Token') },
				baseUrl: 'https://{subdomain}.acme.test',
				auth: (a) => a.bearer('accessToken'),
				renamed: { domain: 'subdomain' },
			}),
		).toThrow('renamed: subdomain is in baseUrl, test or a URL, which do not read an old name');
	});
});

describe('stored credential data', () => {
	const acme = defineCredential({
		id: 'acme.token',
		version: '1.0.0',
		displayName: 'Acme',
		fields: {
			apiToken: field.secret('API Token'),
			account: field.text('Account'),
			region: field.options('Region', { eu: { name: 'EU' }, us: { name: 'US' } }).default('eu'),
		},
		baseUrl: 'https://{region}.acme.test',
		auth: (a) => a.bearer('apiToken'),
	});

	it('fills a declared field that the stored data lacks with its default, without a change to the stored data', () => {
		const stored = Object.freeze({ apiToken: 'tok-1', account: 'a-1' });
		expect(credentialDataOf(acme, stored)).toEqual({
			apiToken: 'tok-1',
			account: 'a-1',
			region: 'eu',
		});
		expect(credentialBaseUrlOf(acme, stored)).toBe('https://eu.acme.test');
		expect(stored).toEqual({ apiToken: 'tok-1', account: 'a-1' });
	});

	it('refuses a required field without a default, with the field and type names but no secret', () => {
		expect(() => credentialDataOf(acme, { apiToken: 'tok-1' })).toThrow(
			'Credential acme.token: acme.token.account: is required',
		);
		const refusal = () => credentialDataOf(acme, { apiToken: 73519046, account: 'a-1' });
		expect(refusal).toThrow('acme.token.apiToken: must be string, got [REDACTED]');
		expect(refusal).not.toThrow('73519046');
	});
});

describe('secretRedactorOf', () => {
	it('removes secrets, derived tokens, base64 and URL-encoded forms, and basic pairs', () => {
		const zendesk = defineCredential({
			id: 'zendesk.token',
			version: '1.0.0',
			displayName: 'Zendesk',
			fields: { email: field.text('Email'), apiToken: field.secret('API Token') },
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
		const acme = defineCredential({
			id: 'acme.oauth2',
			version: '1.0.0',
			displayName: 'Acme',
			fields: { pin: field.secret('PIN').optional() },
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
		const github = compat('githubOAuth2Api', { fields: { server: field.url('Server') } });
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

describe('credentialTypeOfManifest', () => {
	const fromManifest = (type: AnyCredentialType) => {
		const manifest = credentialManifestOf(type);
		if (!manifest) throw new Error('no manifest');
		return credentialTypeOfManifest(parseCredentialManifest(JSON.stringify(manifest)));
	};
	// A generated function is a new value each time.
	const comparable = ({ authenticate, preAuthentication, ...rest }: ICredentialType) => ({
		...rest,
		authenticate: typeof authenticate === 'function' ? 'function' : authenticate,
		preAuthentication: typeof preAuthentication,
	});

	const types: AnyCredentialType[] = [
		defineCredential({
			id: 'acme.oauth2',
			version: '1.0.0',
			legacyName: 'acmeOAuth2Api',
			displayName: 'Acme OAuth2 API',
			legacyParent: 'acmeBaseOAuth2Api',
			fields: { server: field.url('Server').default('https://acme.test') },
			auth: (a) =>
				a.oauth2.authorizationCode({
					authorizationEndpoint: '{server}/oauth/authorize',
					tokenEndpoint: '{server}/oauth/token',
					scope: ['read'],
					pkce: true,
				}),
		}),
		defineCredential({
			id: 'acme.token',
			version: '1.0.0',
			displayName: 'Acme',
			fields: { accessToken: field.secret('Access Token') },
			auth: (a) => a.bearer('accessToken'),
			renamed: { token: 'accessToken' },
		}),
		defineCredential({
			id: 'zendesk.token',
			version: '1.0.0',
			legacyName: 'zendeskApi',
			displayName: 'Zendesk API',
			docs: 'zendesk',
			fields: {
				subdomain: field.text('Subdomain'),
				email: field.text('Email').optional(),
				apiToken: field.secret('API Token'),
			},
			baseUrl: 'https://{subdomain}.zendesk.com/api/v2',
			auth: (a) => a.basic('{email}/token', '{apiToken}'),
			test: { get: '/users/me.json' },
			notice: { text: 'Use an API token.' },
		}),
	];

	it('projects the same n8n type as the source type, also with a legacy parent and renamed fields', () => {
		expect(types.map(fromManifest).map(comparable)).toEqual(types.map(projected).map(comparable));
		expect(fromManifest(types[0]).extends).toEqual(['acmeBaseOAuth2Api']);
	});

	it('signs as the source type', async () => {
		const [, renamed] = types;
		const { authenticate } = fromManifest(renamed);
		if (typeof authenticate !== 'function') throw new Error('not a function');
		const request = { url: 'https://x.test' };
		expect(await authenticate({ token: 'old-1', accessToken: '' }, request)).toEqual(
			await sign(renamed, { token: 'old-1', accessToken: '' }, request),
		);
	});

	it('refuses a custom scheme, which needs a credential bundle', () => {
		const custom = defineCredential({
			id: 'acme.signed',
			version: '1.0.0',
			displayName: 'Acme Signed',
			fields: { key: field.secret('Key') },
			hosts: ['api.acme.test'],
			auth: (a) => a.custom({ reason: 'HMAC', sign: async (_data, request) => request }),
		});
		expect(() => fromManifest(custom)).toThrow(
			'Credential acme.signed: a custom scheme needs a credential bundle',
		);
	});
});

describe('derivedOf', () => {
	const serverOAuth2 = (derive: (fields: { server: string }) => Derived) =>
		defineCredential({
			id: 'acme.oauth2',
			version: '1.0.0',
			displayName: 'Acme OAuth2',
			fields: {
				server: field.url('Server').default('https://api.acme.test'),
				note: field.text('Note').optional(),
				clientSecret: field.secret('Client Secret').optional(),
			},
			hosts: ['*.acme-cdn.test'],
			auth: (a) =>
				a.oauth2.authorizationCode({
					authorizationEndpoint: 'https://acme.test/authorize',
					tokenEndpoint: 'https://acme.test/token',
				}),
			derive,
		});

	it('gives derive the fields without secrets, each default filled in', async () => {
		const seen: unknown[] = [];
		const type = serverOAuth2((fields) => {
			seen.push(fields);
			return { authorizationEndpoint: `${new URL(fields.server).origin}/login/oauth/authorize` };
		});
		await expect(derivedOf(type, { clientSecret: 's', note: 'n' })).resolves.toEqual({
			authorizationEndpoint: 'https://api.acme.test/login/oauth/authorize',
		});
		expect(seen).toEqual([{ server: 'https://api.acme.test', note: 'n' }]);
	});

	it('takes http and https URLs, and hosts of the type or of a URL field value', async () => {
		const type = serverOAuth2(({ server }) => ({
			authorizationEndpoint: 'http://ghe.internal/login/oauth/authorize',
			tokenEndpoint: 'https://ghe.internal/login/oauth/access_token',
			baseUrl: `${server}/api/v3`,
			hosts: ['ghe.internal', 'files.acme-cdn.test'],
		}));
		await expect(derivedOf(type, { server: 'http://ghe.internal' })).resolves.toMatchObject({
			baseUrl: 'http://ghe.internal/api/v3',
		});
	});

	it('refuses another URL scheme, another host and data that is not valid', async () => {
		const at = 'Credential acme.oauth2: derive';
		await expect(
			derivedOf(
				serverOAuth2(() => ({ tokenEndpoint: 'javascript:alert(1)' })),
				{},
			),
		).rejects.toThrow(`${at} gave javascript:alert(1), which is not an http or https URL`);
		await expect(
			derivedOf(
				serverOAuth2(() => ({ hosts: ['evil.test'] })),
				{},
			),
		).rejects.toThrow(
			`${at} gave the hosts evil.test, which are not hosts of the type or of a URL field`,
		);
		// The note is not a URL field.
		await expect(
			derivedOf(
				serverOAuth2(() => ({ baseUrl: 'https://note.test' })),
				{ note: 'https://note.test' },
			),
		).rejects.toThrow(`${at} gave the hosts note.test`);
		const loose = serverOAuth2(() => ({ scope: ['a', 'b'] }) as unknown as Derived);
		await expect(derivedOf(loose, {})).rejects.toThrow(`${at} gave data that is not valid`);
	});

	it('gives undefined for a type without derive', async () => {
		await expect(
			derivedOf(
				serverOAuth2(() => ({})),
				{},
			),
		).resolves.toEqual({});
		const { derive: _, ...plain } = serverOAuth2(() => ({}));
		await expect(derivedOf(plain, {})).resolves.toBeUndefined();
	});
});

describe('jwtBearer', () => {
	const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
	const fields = {
		privateKey: field.secret('Private Key'),
		email: field.text('Email'),
		httpNode: t.bool().default(false),
	};
	const serviceAccount = (derive?: (fields: { email: string; httpNode: boolean }) => Derived) =>
		defineCredential({
			id: 'acme.serviceAccount',
			version: '1.0.0',
			displayName: 'Acme',
			fields,
			auth: (a) =>
				a.oauth2.jwtBearer({
					tokenEndpoint: 'https://oauth2.acme.test/token',
					key: 'privateKey',
					claims: { iss: '{email}', scope: '{$scopes}' },
					scope: ['read', 'write'],
				}),
			...(derive ? { derive } : {}),
		});
	const tokenRequests = () => {
		const sent: IHttpRequestOptions[] = [];
		const http = async (options: IHttpRequestOptions) => {
			sent.push(options);
			return await Promise.resolve({ access_token: 'at-1', expires_in: 3599 });
		};
		return { sent, http };
	};
	const authenticateOf = (type: AnyCredentialType, http?: HostHttp) => {
		const { authenticate } = toCredentialType(type, http) ?? {};
		if (typeof authenticate !== 'function') throw new Error('not a function');
		return authenticate;
	};
	const jwtOf = (options: IHttpRequestOptions) => {
		const assertion = new URLSearchParams(options.body as string).get('assertion') ?? '';
		const [header = '', payload = '', signature = ''] = assertion.split('.');
		const json = (part: string): unknown => JSON.parse(Buffer.from(part, 'base64url').toString());
		const valid = verify(
			'sha256',
			Buffer.from(`${header}.${payload}`),
			publicKey,
			Buffer.from(signature, 'base64url'),
		);
		return { header: json(header), claims: json(payload), valid };
	};

	it('signs an RS256 JWT on the host and sends the token as a bearer header', async () => {
		const { sent, http } = tokenRequests();
		const signed = await authenticateOf(serviceAccount(), http)(
			{ privateKey: pem, email: 'sa@acme.test' },
			{ url: 'https://api.acme.test/x', headers: { Accept: 'application/json' } },
		);

		expect(signed.headers).toEqual({ Accept: 'application/json', Authorization: 'Bearer at-1' });
		expect(sent).toHaveLength(1);
		expect(sent[0]).toMatchObject({
			method: 'POST',
			url: 'https://oauth2.acme.test/token',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		});
		const body = new URLSearchParams(sent[0]?.body as string);
		expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
		const jwt = jwtOf(sent[0] ?? {});
		expect(jwt.valid).toBe(true);
		expect(jwt.header).toEqual({ alg: 'RS256', typ: 'JWT' });
		expect(jwt.claims).toMatchObject({
			iss: 'sa@acme.test',
			scope: 'read write',
			aud: 'https://oauth2.acme.test/token',
		});
	});

	it('takes the claims of derive, but never the token endpoint, audience or lifetime', async () => {
		const { sent, http } = tokenRequests();
		const type = serviceAccount(({ email }) => ({
			tokenEndpoint: 'https://other.test/token',
			claims: { sub: `user+${email}`, aud: 'https://other.test', exp: '9999999999' },
		}));
		await authenticateOf(type, http)({ privateKey: pem, email: 'sa@acme.test' }, { url: '/x' });

		expect(sent.map(({ url }) => url)).toEqual(['https://oauth2.acme.test/token']);
		const { claims } = jwtOf(sent[0] ?? {});
		expect(claims).toMatchObject({
			iss: 'sa@acme.test',
			sub: 'user+sa@acme.test',
			aud: 'https://oauth2.acme.test/token',
		});
		const { exp, iat } = claims as { exp: number; iat: number };
		expect(exp - iat).toBe(3600);
	});

	it('leaves the request as it is and sends no token request when derive gives no claims', async () => {
		const { sent, http } = tokenRequests();
		const type = serviceAccount(({ httpNode }) => (httpNode ? { claims: {} } : {}));
		const request = { url: '/x', headers: { Authorization: 'Bearer own' } };

		await expect(
			authenticateOf(type, http)({ privateKey: pem, email: 'sa@acme.test' }, request),
		).resolves.toEqual(request);
		expect(sent).toEqual([]);
	});

	it('refuses to sign without the HTTP client of the host', async () => {
		await expect(
			authenticateOf(serviceAccount())({ privateKey: pem, email: 'sa@acme.test' }, { url: '/x' }),
		).rejects.toThrow(
			'Credential acme.serviceAccount: the host gives no HTTP client for jwtBearer',
		);
	});
});

describe('the sign of a custom scheme', () => {
	const signed = (url: string) =>
		defineCredential({
			id: 'acme.signed',
			version: '1.0.0',
			displayName: 'Acme Signed',
			fields: { key: field.secret('Key') },
			hosts: ['api.acme.test'],
			auth: (a) =>
				a.custom({
					reason: 'HMAC',
					sign: async ({ key }, request) =>
						await Promise.resolve({ ...request, url, headers: { 'x-signature': key } }),
				}),
		});

	it('gives a request to a credential host', async () => {
		await expect(
			sign(signed('https://api.acme.test/v1/items'), { key: 'k' }, { url: '/items' }),
		).resolves.toMatchObject({ headers: { 'x-signature': 'k' } });
	});

	it('refuses a signed URL outside the credential hosts', async () => {
		await expect(
			sign(signed('https://evil.test/collect'), { key: 'k' }, { url: 'https://api.acme.test/v1' }),
		).rejects.toThrow(
			'Credential acme.signed: the signed request goes to evil.test, which is not a credential host',
		);
	});
});

describe('checkCredentialType', () => {
	it('reports a free-text field whose name looks like a secret', () => {
		const acme = defineCredential({
			id: 'acme.token',
			version: '1.0.0',
			legacyName: 'acmeApi',
			displayName: 'Acme API',
			fields: {
				password: field.text('Password'),
				clientSecret: t.str().optional(),
				apiKey: field.secret('API Key'),
				authorizationUrl: field.url('Authorization URL'),
				accessTokenUrl: field.url('Access Token URL'),
				cookieDomain: t.str().with({ title: 'Cookie Domain', format: 'hostname' }),
				useAccessToken: t.bool(),
				authorization: field.options('Authorization', { header: { name: 'Header' } }),
				accessToken: field.hidden('Access Token'),
				url: field.baseUrl(),
			},
			baseUrl: 'https://api.acme.test',
			auth: (a) => a.bearer('apiKey'),
		});
		expect(checkCredentialType(acme)).toEqual([
			'acme.token: password looks like a secret. Use field.secret.',
			'acme.token: clientSecret looks like a secret. Use field.secret.',
		]);
		expect(checkCredentialType(compat('acmeApi', { fields: { password: t.str() } }))).toEqual([]);
	});
});
