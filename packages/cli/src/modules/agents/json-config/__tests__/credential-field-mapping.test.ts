import {
	isSupportedAgentProvider,
	mapCredentialForProvider,
	SUPPORTED_AGENT_PROVIDERS,
} from '../credential-field-mapping';

describe('mapCredentialForProvider', () => {
	describe.each([
		['moonshotai', 'https://api.moonshot.cn/v1'],
		['minimax', 'https://api.minimaxi.com/v1'],
		['alibaba', 'https://cn-hongkong.dashscope.aliyuncs.com'],
	])('%s', (provider, url) => {
		it("maps the credential's region-derived url onto baseURL", () => {
			expect(mapCredentialForProvider(provider, { apiKey: 'key', url })).toEqual({
				apiKey: 'key',
				baseURL: url,
			});
		});

		it('is a supported agent provider', () => {
			expect(isSupportedAgentProvider(provider)).toBe(true);
			expect(SUPPORTED_AGENT_PROVIDERS).toContain(provider);
		});
	});

	it('passes an unmapped provider through unchanged', () => {
		const raw = { apiKey: 'key', url: 'https://example.com', someOtherField: 'kept' };

		expect(mapCredentialForProvider('not-a-provider', raw)).toEqual(raw);
	});

	describe('azure-openai', () => {
		it('maps an apiKey credential to apiKey + endpoint fields', () => {
			expect(
				mapCredentialForProvider('azure-openai', {
					apiKey: 'az-key',
					resourceName: 'my-resource',
					apiVersion: '2024-02-01',
					endpoint: 'https://my-resource.openai.azure.com',
					endpointType: 'classic',
				}),
			).toEqual({
				apiKey: 'az-key',
				resourceName: 'my-resource',
				apiVersion: '2024-02-01',
				baseURL: 'https://my-resource.openai.azure.com',
				endpointType: 'classic',
			});
		});

		it('maps an Entra credential to OAuth fields and omits apiKey', () => {
			expect(
				mapCredentialForProvider('azure-openai', {
					resourceName: 'my-resource',
					apiVersion: '2024-02-01',
					endpoint: 'https://my-resource.openai.azure.com',
					endpointType: 'classic',
					clientId: 'client-id',
					clientSecret: 'client-secret',
					accessTokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
					scope: 'https://cognitiveservices.azure.com/.default',
					authentication: 'body',
					oauthTokenData: { access_token: 'stored-token' },
				}),
			).toEqual({
				resourceName: 'my-resource',
				apiVersion: '2024-02-01',
				baseURL: 'https://my-resource.openai.azure.com',
				endpointType: 'classic',
				oauthClientId: 'client-id',
				oauthClientSecret: 'client-secret',
				oauthAccessTokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
				oauthScope: 'https://cognitiveservices.azure.com/.default',
				oauthAuthentication: 'body',
				oauthTokenData: { access_token: 'stored-token' },
			});
		});

		it('maps a Foundry Entra credential through foundryEndpoint', () => {
			expect(
				mapCredentialForProvider('azure-openai', {
					apiVersion: '2024-02-01',
					endpointType: 'foundry',
					foundryEndpoint: 'https://my-resource.services.ai.azure.com/openai/v1',
					clientId: 'client-id',
					clientSecret: 'client-secret',
					accessTokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
					oauthTokenData: { access_token: 'stored-token' },
				}),
			).toEqual({
				apiVersion: '2024-02-01',
				baseURL: 'https://my-resource.services.ai.azure.com/openai/v1',
				endpointType: 'foundry',
				oauthClientId: 'client-id',
				oauthClientSecret: 'client-secret',
				oauthAccessTokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
				oauthTokenData: { access_token: 'stored-token' },
			});
		});
	});
});
