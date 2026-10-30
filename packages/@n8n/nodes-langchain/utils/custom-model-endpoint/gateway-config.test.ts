import type { ICredentialDataDecryptedObject, INode, ISupplyDataFunctions } from 'n8n-workflow';

// The dispatcher needs the instance SSRF module, which a unit test does not stand up
vi.mock('@n8n/ai-utilities', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities')>()),
	getProxyAgent: () => undefined,
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
	const ctx = {
		getNode: () => nodeWith({ [CUSTOM_MODEL_ENDPOINT_CREDENTIAL]: {} }),
		helpers: { getSecureEgressFilter: () => ({ validateUrl: async () => ({ ok: true }) }) },
	} as unknown as ISupplyDataFunctions;

	it('points the client at the credential base URL and gives it a fetch of our own', () => {
		const { configuration, endpoint } = createCustomModelEndpointConfig(
			ctx,
			{ url: 'https://gateway.example.com/v1', authentication: 'none' },
			{ credentialType: CUSTOM_MODEL_ENDPOINT_CREDENTIAL },
		);

		expect(configuration.baseURL).toBe('https://gateway.example.com/v1');
		expect(typeof configuration.fetch).toBe('function');
		expect(endpoint.login.type).toBe('none');
	});
});
