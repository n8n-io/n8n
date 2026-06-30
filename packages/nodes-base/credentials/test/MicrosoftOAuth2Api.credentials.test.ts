import { MicrosoftOAuth2Api } from '../MicrosoftOAuth2Api.credentials';

describe('MicrosoftOAuth2Api Credential', () => {
	const microsoftOAuth2Api = new MicrosoftOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(microsoftOAuth2Api.name).toBe('microsoftOAuth2Api');
		expect(microsoftOAuth2Api.displayName).toBe('Microsoft OAuth2 API');
		expect(microsoftOAuth2Api.extends).toEqual(['oAuth2Api']);

		const authUrlProperty = microsoftOAuth2Api.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe(
			'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
		);

		const accessTokenUrlProperty = microsoftOAuth2Api.properties.find(
			(p) => p.name === 'accessTokenUrl',
		);
		expect(accessTokenUrlProperty?.default).toBe(
			'https://login.microsoftonline.com/common/oauth2/v2.0/token',
		);
	});

	it('should request the Microsoft account chooser via authQueryParameters', () => {
		const authQueryParamsProperty = microsoftOAuth2Api.properties.find(
			(p) => p.name === 'authQueryParameters',
		);
		expect(authQueryParamsProperty?.type).toBe('hidden');
		expect(authQueryParamsProperty?.default).toBe('response_mode=query&prompt=select_account');
	});
});
