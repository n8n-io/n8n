import { ZohoOAuth2Api } from '../ZohoOAuth2Api.credentials';

describe('ZohoOAuth2Api Credential', () => {
	const credential = new ZohoOAuth2Api();

	it('should offer Zoho Canada OAuth endpoints', () => {
		const authUrl = credential.properties.find((property) => property.name === 'authUrl');
		const accessTokenUrl = credential.properties.find(
			(property) => property.name === 'accessTokenUrl',
		);

		expect(authUrl?.options).toContainEqual({
			name: 'https://accounts.zohocloud.ca/oauth/v2/auth',
			value: 'https://accounts.zohocloud.ca/oauth/v2/auth',
			description: 'For the CA domain',
		});
		expect(accessTokenUrl?.options).toContainEqual({
			name: 'CA - https://accounts.zohocloud.ca/oauth/v2/token',
			value: 'https://accounts.zohocloud.ca/oauth/v2/token',
		});
	});
});
