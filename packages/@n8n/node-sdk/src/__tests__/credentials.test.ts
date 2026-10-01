import type { IHttpRequestHelper, IHttpRequestOptions, INode } from 'n8n-workflow';

import {
	apiKey,
	basic,
	bearer,
	compat,
	custom,
	defineAction,
	defineNode,
	oauth2,
	obj,
	oneOf,
	str,
	toCredentialType,
	type CredentialFields,
} from '../index';
import { executorOf, type ExecutorHost } from '../runtime';

const request: IHttpRequestOptions = { url: 'https://api.test/x', headers: { accept: 'json' } };

describe('credential builders', () => {
	it('projects an API key in a header or in the query to generic authentication', () => {
		const header = apiKey({ name: 'acmeApi', displayName: 'Acme API', key: 'X-API-Key' });
		const query = apiKey({ name: 'acmeQueryApi', displayName: 'Acme', key: 'key', in: 'query' });
		expect(toCredentialType(header)).toEqual({
			name: 'acmeApi',
			displayName: 'Acme API',
			properties: [
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					typeOptions: { password: true },
					required: true,
					default: '',
				},
			],
			authenticate: {
				type: 'generic',
				properties: { headers: { 'X-API-Key': '={{$credentials.apiKey}}' } },
			},
		});
		expect(toCredentialType(query)?.authenticate).toEqual({
			type: 'generic',
			properties: { qs: { key: '={{$credentials.apiKey}}' } },
		});
	});

	it('projects bearer and basic auth, with plain fields before secrets', () => {
		const token = bearer({ name: 'acmeBearer', displayName: 'Acme' });
		const login = basic({
			name: 'acmeBasic',
			displayName: 'Acme',
			fields: { server: str().with({ title: 'Server' }).default('https://acme.test') },
		});
		expect(toCredentialType(token)?.authenticate).toEqual({
			type: 'generic',
			properties: { headers: { Authorization: '=Bearer {{$credentials.token}}' } },
		});
		const projected = toCredentialType(login);
		expect(
			projected?.properties.map(({ name, type, typeOptions }) => [name, type, typeOptions]),
		).toEqual([
			['server', 'string', undefined],
			['user', 'string', undefined],
			['password', 'string', { password: true }],
		]);
		expect(projected?.authenticate).toEqual({
			type: 'generic',
			properties: {
				auth: { username: '={{$credentials.user}}', password: '={{$credentials.password}}' },
			},
		});
	});

	it('projects an OAuth2 app to a child of oAuth2Api with hidden settings', () => {
		const app = oauth2({
			name: 'acmeOAuth2Api',
			displayName: 'Acme OAuth2 API',
			authorizationUrl: 'https://acme.test/authorize',
			tokenUrl: 'https://acme.test/token',
			scopes: ['read', 'write'],
			pkce: true,
			clientAuth: 'body',
			refresh: { onStatus: [401, 403] },
		});
		const projected = toCredentialType(app);
		expect(projected?.extends).toEqual(['oAuth2Api']);
		expect(projected?.authenticate).toBeUndefined();
		expect(
			Object.fromEntries((projected?.properties ?? []).map((p) => [p.name, p.default])),
		).toEqual({
			grantType: 'pkce',
			authUrl: 'https://acme.test/authorize',
			accessTokenUrl: 'https://acme.test/token',
			scope: 'read write',
			authQueryParameters: '',
			authentication: 'body',
		});
		expect(projected?.properties.every(({ type }) => type === 'hidden')).toBe(true);
		expect(app.scheme).toMatchObject({ options: { tokenExpiredStatusCode: [401, 403] } });
	});

	it('runs a custom authenticate with typed data and a session token', async () => {
		const signed = custom({
			name: 'signedApi',
			displayName: 'Signed API',
			fields: { region: oneOf('eu', 'us').default('eu') },
			secrets: { clientSecret: str() },
			session: {
				field: 'sessionToken',
				async fetch({ clientSecret, region }, helpers) {
					const body: unknown = await helpers.httpRequest({
						method: 'POST',
						url: `https://${region}.signed.test/token`,
						body: { clientSecret },
					});
					return typeof body === 'string' ? body : '';
				},
			},
			async authenticate({ sessionToken, region }, options) {
				return await Promise.resolve({
					...options,
					headers: { ...options.headers, 'x-session': sessionToken, 'x-region': region },
				});
			},
		});
		const projected = toCredentialType(signed);
		expect(projected?.properties.at(-1)).toEqual({
			displayName: 'sessionToken',
			name: 'sessionToken',
			type: 'hidden',
			default: '',
			typeOptions: { expirable: true },
		});
		const sent: unknown[] = [];
		const helper = {
			helpers: {
				httpRequest: async (options: unknown) => {
					sent.push(options);
					return await Promise.resolve('t-1');
				},
			},
		} as unknown as IHttpRequestHelper;
		const token = await projected?.preAuthentication?.call(helper, { clientSecret: 's' });
		expect(token).toEqual({ sessionToken: 't-1' });
		expect(sent).toEqual([
			{ method: 'POST', url: 'https://eu.signed.test/token', body: { clientSecret: 's' } },
		]);
		const authenticate = projected?.authenticate;
		if (typeof authenticate !== 'function') throw new Error('authenticate is not a function');
		// The region default fills in, as for credentials saved before the field existed.
		expect(await authenticate({ clientSecret: 's', sessionToken: 't-1' }, request)).toEqual({
			...request,
			headers: { accept: 'json', 'x-session': 't-1', 'x-region': 'eu' },
		});
		await expect(authenticate({ region: 'mars', sessionToken: 't' }, request)).rejects.toThrow(
			/^Credential signedApi: /,
		);
	});

	it('has no projection for a compat credential: its legacy class stays the definition', () => {
		expect(toCredentialType(compat('gmailOAuth2'))).toBeUndefined();
	});
});

const zoneApi = apiKey({
	name: 'zoneApi',
	displayName: 'Zone API',
	key: 'X-Key',
	fields: { region: oneOf('eu', 'us').default('eu') },
	baseUrl: ({ region }) => `https://${region}.zone.test`,
});
const zoneOAuth2Api = oauth2({
	name: 'zoneOAuth2Api',
	displayName: 'Zone OAuth2',
	authorizationUrl: 'https://zone.test/authorize',
	tokenUrl: 'https://zone.test/token',
	refresh: { onStatus: 403 },
});
const zone = defineNode({
	id: 'zone',
	displayName: 'Zone',
	credentials: [zoneApi, zoneOAuth2Api],
	baseUrl: 'https://zone.test',
});
const read = { effect: 'read', cardinality: '1:N', passthrough: 'replace' } as const;

const host = (credential: string, data: unknown) => {
	const requests: unknown[][] = [];
	const node: INode = {
		id: '1',
		name: 'Zone',
		type: 'zone',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { [credential]: { id: '1', name: 'Zone' } },
	};
	const fake: ExecutorHost = {
		itemCount: 1,
		node,
		parameter: (name) => (name === 'authentication' ? credential : undefined),
		request: async (...args) => {
			requests.push(args);
			return await Promise.resolve([]);
		},
		credentialData: async () => await Promise.resolve(data),
		continueOnFail: () => false,
	};
	return { fake, requests };
};

describe('credential values on nodes and actions', () => {
	it('gives run() the typed fields of the credential and its base URL', async () => {
		const seen: unknown[] = [];
		const action = defineAction({
			node: zone,
			id: 'zone.record.getAll',
			action: 'Get records',
			summary: 'List records.',
			flow: read,
			input: {},
			output: obj({ id: str() }),
			async run({ credential, http }) {
				// `type` narrows the union: only the API key credential has `region`.
				seen.push(credential.type === 'zoneApi' ? credential.region : 'oauth');
				await http.request({ path: '/records' });
			},
		});
		const apiKeyRun = host('zoneApi', { apiKey: 'k', region: 'us' });
		await executorOf(action)(apiKeyRun.fake);
		const oauthRun = host('zoneOAuth2Api', {});
		await executorOf(action)(oauthRun.fake);
		expect(seen).toEqual(['us', 'oauth']);
		expect(apiKeyRun.requests[0]).toEqual([
			expect.objectContaining({ url: 'https://us.zone.test/records' }),
			'zoneApi',
			undefined,
		]);
		// The OAuth2 refresh options reach httpRequestWithAuthentication.
		expect(oauthRun.requests[0]).toEqual([
			expect.objectContaining({ url: 'https://zone.test/records' }),
			'zoneOAuth2Api',
			{ tokenExpiredStatusCode: 403 },
		]);
	});

	it('types credential references and fields', () => {
		const otherApi = bearer({ name: 'otherApi', displayName: 'Other' });
		const base = {
			node: zone,
			id: 'zone.record.get',
			action: 'Get a record',
			summary: 'Get one record.',
			flow: read,
			input: {},
			output: obj({ id: str() }),
		} as const;
		defineAction({ ...base, credentials: [zoneApi], async run() {} });
		// @ts-expect-error a credential the node does not list
		defineAction({ ...base, credentials: [otherApi], async run() {} });
		// @ts-expect-error a credential name is a string, not a credential value
		defineNode({ id: 'zone', displayName: 'Zone', credentials: ['zoneApi'] });
		defineAction({
			...base,
			credentials: [zoneApi],
			async run({ credential }) {
				const region: 'eu' | 'us' = credential.region;
				// @ts-expect-error a field the credential does not have
				const typo: string = credential.regoin;
				// @ts-expect-error secrets never reach run()
				const secret: string = credential.apiKey;
				expect([region, typo, secret]).toBeDefined();
			},
		});
		apiKey({
			name: 'typedApi',
			displayName: 'Typed',
			key: 'X-Key',
			fields: { host: str() },
			// @ts-expect-error the base URL reads a field the credential does not have
			baseUrl: ({ hots }) => `https://${String(hots)}`,
		});
		custom({
			name: 'typedCustom',
			displayName: 'Typed',
			secrets: { key: str() },
			async authenticate(data, options) {
				// @ts-expect-error a secret the credential does not have
				const missing: string = data.token;
				return await Promise.resolve({ ...options, headers: { k: data.key, missing } });
			},
		});
		const fields: CredentialFields<typeof zoneApi> = { type: 'zoneApi', region: 'eu' };
		expect(fields.type).toBe('zoneApi');
	});
});
