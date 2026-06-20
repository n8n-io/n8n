import { TwitterOAuth2Api } from '../TwitterOAuth2Api.credentials';

describe('TwitterOAuth2Api Credential', () => {
	const credential = new TwitterOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('twitterOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);

		const authUrlProperty = credential.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://x.com/i/oauth2/authorize');

		const accessTokenUrlProperty = credential.properties.find((p) => p.name === 'accessTokenUrl');
		expect(accessTokenUrlProperty?.default).toBe('https://api.x.com/2/oauth2/token');
	});

	it('should use PKCE grant type', () => {
		const grantTypeProperty = credential.properties.find((p) => p.name === 'grantType');
		expect(grantTypeProperty?.type).toBe('hidden');
		expect(grantTypeProperty?.default).toBe('pkce');
	});

	it('should use header authentication', () => {
		const authenticationProperty = credential.properties.find((p) => p.name === 'authentication');
		expect(authenticationProperty?.type).toBe('hidden');
		expect(authenticationProperty?.default).toBe('header');
	});

	it('should default scope to the full scope list', () => {
		const scopeProperty = credential.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toBeTruthy();
	});
});
