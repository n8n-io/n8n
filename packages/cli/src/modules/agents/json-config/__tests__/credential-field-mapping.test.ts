import {
	isSupportedAgentProvider,
	mapCredentialForProvider,
	SUPPORTED_AGENT_PROVIDERS,
} from '../credential-field-mapping';

describe('mapCredentialForProvider', () => {
	it.each([
		'https://ai-gateway.vercel.sh/v4/ai',
		'https://gateway.example.com/v4/ai',
		'https://gateway.example.com/v1',
	])('preserves a custom Vercel credential URL %s', (url) => {
		expect(mapCredentialForProvider('vercel', { apiKey: 'key', url })).toEqual({
			apiKey: 'key',
			baseURL: url,
		});
	});

	it('uses the native Vercel SDK endpoint when the credential has no URL', () => {
		expect(mapCredentialForProvider('vercel', { apiKey: 'key' })).toEqual({ apiKey: 'key' });
	});

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

		// Guards the shared isEntra predicate: a whitespace-only apiKey must not
		// count as "present", and an oauthTokenData object without an access_token
		// must not count as Entra. Both edge cases previously diverged across the
		// mapper, the Zod schema, and the model factory.
		it('drops a whitespace-only apiKey and does not treat it as Entra', () => {
			expect(
				mapCredentialForProvider('azure-openai', {
					apiKey: '   ',
					resourceName: 'my-resource',
					apiVersion: '2024-02-01',
					endpoint: 'https://my-resource.openai.azure.com',
					endpointType: 'classic',
				}),
			).toEqual({
				resourceName: 'my-resource',
				apiVersion: '2024-02-01',
				baseURL: 'https://my-resource.openai.azure.com',
				endpointType: 'classic',
			});
		});

		it('does not treat an oauthTokenData object without access_token as Entra', () => {
			expect(
				mapCredentialForProvider('azure-openai', {
					apiKey: 'az-key',
					resourceName: 'my-resource',
					apiVersion: '2024-02-01',
					endpoint: 'https://my-resource.openai.azure.com',
					endpointType: 'classic',
					oauthTokenData: {
						/* disconnected: no access_token */
					},
				}),
			).toEqual({
				apiKey: 'az-key',
				resourceName: 'my-resource',
				apiVersion: '2024-02-01',
				baseURL: 'https://my-resource.openai.azure.com',
				endpointType: 'classic',
			});
		});
	});
});
