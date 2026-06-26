import { MiroOAuth2Api } from '../MiroOAuth2Api.credentials';

describe('MiroOAuth2Api Credential', () => {
	const miroOAuth2Api = new MiroOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(miroOAuth2Api.name).toBe('miroOAuth2Api');
		expect(miroOAuth2Api.extends).toEqual(['oAuth2Api']);
		expect(miroOAuth2Api.displayName).toBe('Miro OAuth2 API');
	});

	it('should have scope property visible and editable', () => {
		const scopeProperty = miroOAuth2Api.properties.find((p) => p.name === 'scope');

		expect(scopeProperty).toBeDefined();
		expect(scopeProperty?.type).toBe('string');
		expect(scopeProperty?.required).toBe(true);
		expect(scopeProperty?.default).toBe('boards:read boards:write');
	});

	it('should have correct OAuth2 URLs', () => {
		const authUrlProperty = miroOAuth2Api.properties.find((p) => p.name === 'authUrl');
		const accessTokenUrlProperty = miroOAuth2Api.properties.find(
			(p) => p.name === 'accessTokenUrl',
		);

		expect(authUrlProperty?.default).toBe('https://miro.com/oauth/authorize');
		expect(accessTokenUrlProperty?.default).toBe('https://api.miro.com/v1/oauth/token');
	});

	it('should have hidden grant type set to authorizationCode', () => {
		const grantTypeProperty = miroOAuth2Api.properties.find((p) => p.name === 'grantType');

		expect(grantTypeProperty?.type).toBe('hidden');
		expect(grantTypeProperty?.default).toBe('authorizationCode');
	});
});
