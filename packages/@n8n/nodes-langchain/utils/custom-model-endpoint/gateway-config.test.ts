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

	it('carries the login, the per-request headers and the timeout to the wire', async () => {
		const { configuration } = withKey({
			timeout: 1_500,
			requestHeaders: { 'x-n8n-workflow-id': 'wf-1' },
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
		['one of its own', JSON.stringify({ message: `Rejected ${KEY}` })],
		[
			'one already shaped for the client',
			JSON.stringify({ error: { message: `Rejected ${KEY}` } }),
		],
	])(
		'reshapes and redacts a gateway failure that echoes the key, given %s',
		async (_name, body) => {
			gateway.reply = new Response(body, { status: 401 });
			const { configuration } = withKey();

			const response = await configuration.fetch?.(
				'https://gateway.example.com/v1/chat/completions',
			);
			const text = (await response?.text()) ?? '';

			expect(response?.status).toBe(401);
			expect(text).not.toContain(KEY);
			expect(JSON.parse(text)).toMatchObject({ error: { message: 'Rejected [redacted]' } });
		},
	);
});
