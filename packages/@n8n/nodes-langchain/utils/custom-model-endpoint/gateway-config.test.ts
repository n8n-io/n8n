import type { UserError } from '@n8n/errors';

import type { AccessTokenSource } from './oauth2';
import type {
	ICredentialDataDecryptedObject,
	INode,
	ISupplyDataFunctions,
	NodeEgressFilter,
} from 'n8n-workflow';

// The dispatcher needs the instance SSRF module, which a unit test does not stand up
const { gateway } = vi.hoisted(() => ({
	gateway: {
		reply: new Response('{}', { status: 200 }),
		calls: [] as Array<{ url: string; headers: Headers; timeout?: number }>,
	},
}));

vi.mock('@n8n/ai-utilities', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities')>()),
	getProxyAgent: () => undefined,
	proxyFetch: async ({
		input,
		init,
		timeoutOptions,
	}: {
		input: RequestInfo | URL;
		init?: RequestInit;
		timeoutOptions?: { headersTimeout?: number };
	}) => {
		gateway.calls.push({
			url: String(input),
			headers: new Headers(init?.headers ?? {}),
			timeout: timeoutOptions?.headersTimeout,
		});
		return gateway.reply.clone();
	},
}));

import {
	CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
	OPENAI_CREDENTIAL,
	createCustomModelEndpointConfig,
	createRunTokenSource,
	pickCredentialType,
	readEndpointCredential,
} from './gateway-config';

const nodeWith = (credentials?: Record<string, unknown>) =>
	({
		id: '1',
		name: 'n',
		type: 't',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials,
	}) as unknown as INode;

describe('pickCredentialType', () => {
	it.each([
		[
			'the custom one when it is set',
			{ [CUSTOM_MODEL_ENDPOINT_CREDENTIAL]: {} },
			CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
		],
		['the OpenAI one when that is set instead', { [OPENAI_CREDENTIAL]: {} }, OPENAI_CREDENTIAL],
		[
			'the custom one when both are set',
			{ [OPENAI_CREDENTIAL]: {}, [CUSTOM_MODEL_ENDPOINT_CREDENTIAL]: {} },
			CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
		],
	])('picks %s', (_name, credentials, expected) => {
		expect(pickCredentialType(nodeWith(credentials))).toBe(expected);
	});

	it.each([
		['the custom one', CUSTOM_MODEL_ENDPOINT_CREDENTIAL],
		['the OpenAI one', OPENAI_CREDENTIAL],
	])('follows the Authentication field to %s, whatever is attached', (_name, chosen) => {
		const node = {
			...nodeWith({ [OPENAI_CREDENTIAL]: {}, [CUSTOM_MODEL_ENDPOINT_CREDENTIAL]: {} }),
			parameters: { authentication: chosen },
		} as unknown as INode;

		expect(pickCredentialType(node)).toBe(chosen);
	});

	it('asks for a credential when the node has none', () => {
		expect(() => pickCredentialType(nodeWith(undefined))).toThrow('no credential');
	});
});

describe('readEndpointCredential', () => {
	it('reads an OpenAI credential as a Bearer login, so an existing one keeps working', () => {
		const data: ICredentialDataDecryptedObject = {
			apiKey: 'sk-live-1',
			url: 'https://gateway.example.com/v1/',
		};

		expect(readEndpointCredential(OPENAI_CREDENTIAL, data)).toEqual({
			baseUrl: 'https://gateway.example.com/v1',
			login: { type: 'bearer', token: 'sk-live-1' },
			gatewayHeaders: {},
		});
	});

	it('carries the one custom header and the organisation of an OpenAI credential', () => {
		const data: ICredentialDataDecryptedObject = {
			apiKey: 'sk-live-1',
			url: 'https://gateway.example.com/v1',
			organizationId: 'org-9',
			header: true,
			headerName: 'X-Tenant',
			headerValue: 'acme',
		};

		expect(readEndpointCredential(OPENAI_CREDENTIAL, data).gatewayHeaders).toEqual({
			'OpenAI-Organization': 'org-9',
			'X-Tenant': 'acme',
		});
	});

	it('ignores the custom header of an OpenAI credential when the switch is off', () => {
		const data: ICredentialDataDecryptedObject = {
			apiKey: 'sk-live-1',
			url: 'https://gateway.example.com/v1',
			header: false,
			headerName: 'X-Tenant',
			headerValue: 'acme',
		};

		expect(readEndpointCredential(OPENAI_CREDENTIAL, data).gatewayHeaders).toEqual({});
	});
});

describe('createCustomModelEndpointConfig', () => {
	const KEY = 'sk-live-9f2a71c4ab';

	beforeEach(() => {
		gateway.reply = new Response('{}', { status: 200 });
		gateway.calls.length = 0;
	});

	// A test double stands in for the instance SSRF module, as the siblings do
	const filterFrom = (validateUrl: unknown) =>
		({ validateUrl, createSecureLookup: () => undefined }) as unknown as NodeEgressFilter;

	const contextWith = (egressFilter: NodeEgressFilter) =>
		({
			getNode: () => nodeWith({ [CUSTOM_MODEL_ENDPOINT_CREDENTIAL]: {} }),
			helpers: { getSecureEgressFilter: () => egressFilter },
		}) as unknown as ISupplyDataFunctions;

	const configFor = (egressFilter: NodeEgressFilter) =>
		createCustomModelEndpointConfig(
			contextWith(egressFilter),
			{ url: 'https://gateway.example.com/v1', authentication: 'none' },
			{ credentialType: CUSTOM_MODEL_ENDPOINT_CREDENTIAL },
		);

	it('points the client at the credential base URL', () => {
		const { configuration, endpoint } = configFor(filterFrom(vi.fn(async () => ({ ok: true }))));

		expect(configuration.baseURL).toBe('https://gateway.example.com/v1');
		expect(endpoint.login.type).toBe('none');
	});

	it.each([
		['is empty', ''],
		['is not a URL at all', 'my-gateway'],
		['names a scheme the client cannot call', 'ftp://gateway.example.com'],
	])('refuses a base URL that %s, rather than falling back to another host', (_name, url) => {
		expect(() =>
			createCustomModelEndpointConfig(
				contextWith(filterFrom(vi.fn(async () => ({ ok: true })))),
				{ url, authentication: 'none' },
				{ credentialType: CUSTOM_MODEL_ENDPOINT_CREDENTIAL },
			),
		).toThrow('no usable Base URL');
	});

	it.each([
		['a user name and a password', 'https://tenant:s3cr3t@gateway.example.com/v1', 's3cr3t'],
		['a user name alone', 'https://tenant@gateway.example.com/v1', 'tenant'],
	])('refuses a base URL carrying %s, without repeating it', (_name, url, carried) => {
		const build = () =>
			createCustomModelEndpointConfig(
				contextWith(filterFrom(vi.fn(async () => ({ ok: true })))),
				{ url, authentication: 'none' },
				{ credentialType: CUSTOM_MODEL_ENDPOINT_CREDENTIAL },
			);

		// The transport would otherwise refuse it and name the whole URL in the error
		const error = (() => {
			try {
				build();
				return undefined;
			} catch (reason) {
				return reason as UserError;
			}
		})();

		expect(error?.message).toContain('carries a user name or a password');
		expect(`${error?.message} ${error?.description ?? ''}`).not.toContain(carried);
	});

	// The login server is the second host the credential names, so it takes the same check
	const oauth2With = (tokenUrl: string) => ({
		url: 'https://gateway.example.com/v1',
		authentication: 'oauth2',
		tokenUrl,
		clientId: 'cid',
		clientSecret: 'shh',
	});

	const buildWith = (tokenUrl: string) =>
		createCustomModelEndpointConfig(
			contextWith(filterFrom(vi.fn(async () => ({ ok: true })))),
			oauth2With(tokenUrl),
			{ credentialType: CUSTOM_MODEL_ENDPOINT_CREDENTIAL },
		);

	const refusalFor = (tokenUrl: string) => {
		try {
			buildWith(tokenUrl);
			return undefined;
		} catch (reason) {
			return reason as UserError;
		}
	};

	it('builds a config from an OAuth2 credential whose token URL is usable', () => {
		expect(buildWith('https://login.example.com/token').configuration.baseURL).toBe(
			'https://gateway.example.com/v1',
		);
	});

	it.each([
		['is empty', ''],
		['names no scheme', 'login.example.com/token'],
		['names a scheme the client cannot call', 'ftp://login.example.com/token'],
	])('refuses a token URL that %s', (_name, tokenUrl) => {
		expect(refusalFor(tokenUrl)?.message).toBe('The credential has no usable Token URL');
	});

	it.each([
		['a user name and a password', 'https://cid:s3cr3t@login.example.com/token', 's3cr3t'],
		['a user name alone', 'https://cid@login.example.com/token', 'cid'],
	])('refuses a token URL carrying %s, without repeating it', (_name, tokenUrl, carried) => {
		const error = refusalFor(tokenUrl);

		expect(error?.message).toBe(
			'The Token URL of the credential carries a user name or a password',
		);
		expect(`${error?.message} ${error?.description ?? ''}`).not.toContain(carried);
	});

	it('checks the target against the egress filter before the request leaves', async () => {
		const validateUrl = vi.fn(async () => ({ ok: true }));
		const { configuration } = configFor(filterFrom(validateUrl));

		await configuration.fetch?.('https://gateway.example.com/v1/chat/completions');

		expect(validateUrl).toHaveBeenCalledWith('https://gateway.example.com/v1/chat/completions');
	});

	it('refuses a target the egress filter rejects', async () => {
		const blocked = new Error('Blocked by SSRF policy');
		const { configuration } = configFor(
			filterFrom(vi.fn(async () => ({ ok: false, error: blocked }))),
		);

		await expect(configuration.fetch?.('https://gateway.example.com/v1/models')).rejects.toThrow(
			'Blocked by SSRF policy',
		);
	});

	const withKey = (overrides: Record<string, unknown> = {}) =>
		createCustomModelEndpointConfig(
			contextWith(filterFrom(vi.fn(async () => ({ ok: true })))),
			{
				url: 'https://gateway.example.com/v1',
				authentication: 'bearer',
				apiKey: KEY,
			},
			{ credentialType: CUSTOM_MODEL_ENDPOINT_CREDENTIAL, ...overrides },
		);

	// The secret list is built from this, so a caller that passes it must reach the filter
	it('carries the headers the user typed into the redaction of an error', async () => {
		const typed = 'Zx7Qw2Lm9Rt4Bv6N';
		gateway.reply = new Response(JSON.stringify({ error: { message: `bad key ${typed}` } }), {
			status: 401,
			headers: { 'content-type': 'application/json' },
		});
		const { configuration } = withKey({
			userHeaders: { 'x-api-key': typed },
		});

		const response = await configuration.fetch!('https://gateway.example.com/v1/chat/completions');

		expect(await response.text()).not.toContain(typed);
	});

	it('carries the login, the per-request headers and the timeout to the wire', async () => {
		const { configuration } = withKey({
			timeout: 1_500,
			contextHeaders: { 'x-n8n-workflow-id': 'wf-1' },
		});

		await configuration.fetch?.('https://gateway.example.com/v1/chat/completions');

		expect(gateway.calls.at(-1)).toMatchObject({
			url: 'https://gateway.example.com/v1/chat/completions',
			timeout: 1_500,
		});
		expect(gateway.calls.at(-1)?.headers.get('authorization')).toBe(`Bearer ${KEY}`);
		expect(gateway.calls.at(-1)?.headers.get('x-n8n-workflow-id')).toBe('wf-1');
	});

	it.each([
		['one of its own', JSON.stringify({ message: 'Rejected' })],
		['one already shaped for the client', JSON.stringify({ error: { message: 'Rejected' } })],
	])('reshapes a gateway failure, given %s', async (_name, body) => {
		gateway.reply = new Response(body, { status: 401 });
		const { configuration } = withKey();

		const response = await configuration.fetch?.('https://gateway.example.com/v1/chat/completions');
		const text = (await response?.text()) ?? '';

		expect(response?.status).toBe(401);
		expect(JSON.parse(text)).toMatchObject({ error: { message: 'Rejected' } });
	});
});

describe('createRunTokenSource', () => {
	const TOKEN_URL = 'https://login.example.com/oauth2/token';

	const OAUTH2_CREDENTIAL = {
		url: 'https://gateway.example.com/v1',
		authentication: 'oauth2',
		tokenUrl: TOKEN_URL,
		clientId: 'id',
		clientSecret: 'secret',
	} as const;

	const context = () =>
		({
			getNode: () => nodeWith({ [CUSTOM_MODEL_ENDPOINT_CREDENTIAL]: {} }),
			helpers: {
				getSecureEgressFilter: () =>
					({
						validateUrl: async () => ({ ok: true }),
						createSecureLookup: () => undefined,
					}) as unknown as NodeEgressFilter,
			},
		}) as unknown as ISupplyDataFunctions;

	// This is an entry point of its own, and the source it builds talks to the token URL,
	// so checking the base URL alone would leave that one to the first request
	it.each([
		['is relative', '/oauth2/token'],
		['names no host', 'https://'],
		['carries a user name and a password', 'https://user:pass@login.example.com/token'],
	])('refuses a token URL that %s', (_name, tokenUrl) => {
		expect(() =>
			createRunTokenSource(
				context(),
				{ ...OAUTH2_CREDENTIAL, tokenUrl },
				CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
			),
		).toThrow(/Token URL/);
	});

	const tokenRequests = () => gateway.calls.filter((call) => call.url === TOKEN_URL).length;

	/** What the action node does: a transport for each item, and one call through each. */
	const runOverItems = async (itemCount: number, tokenSource?: AccessTokenSource) => {
		for (let item = 0; item < itemCount; item++) {
			const { configuration } = createCustomModelEndpointConfig(context(), OAUTH2_CREDENTIAL, {
				credentialType: CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
				userHeaders: { 'x-item': String(item) },
				tokenSource,
			});

			await configuration.fetch!('https://gateway.example.com/v1/chat/completions', {
				method: 'POST',
			});
		}
	};

	beforeEach(() => {
		gateway.calls.length = 0;
		gateway.reply = new Response(
			JSON.stringify({ access_token: 'at', token_type: 'Bearer', expires_in: 3600 }),
			{ status: 200, headers: { 'content-type': 'application/json' } },
		);
	});

	it.each([1, 2, 10])('signs in one time for a run of %i items', async (itemCount) => {
		await runOverItems(
			itemCount,
			createRunTokenSource(context(), OAUTH2_CREDENTIAL, CUSTOM_MODEL_ENDPOINT_CREDENTIAL),
		);

		expect(tokenRequests()).toBe(1);
	});

	// The default when nobody passes a source: the cache dies with the transport. The
	// sub-node builds one transport for a run, so this costs it nothing; the action node
	// builds one for each item, which is why it passes a source in.
	it('signs in for every transport that builds its own source', async () => {
		await runOverItems(3);

		expect(tokenRequests()).toBe(3);
	});

	it('gives no source to a credential that does not sign in', () => {
		const source = createRunTokenSource(
			context(),
			{ url: 'https://gateway.example.com/v1', authentication: 'none' },
			CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
		);

		expect(source).toBeUndefined();
	});
});
