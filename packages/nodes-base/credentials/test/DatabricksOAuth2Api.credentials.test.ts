import { DatabricksOAuth2Api } from '../DatabricksOAuth2Api.credentials';

describe('DatabricksOAuth2Api Credential', () => {
	const databricksOAuth2Api = new DatabricksOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(databricksOAuth2Api.name).toBe('databricksOAuth2Api');
		expect(databricksOAuth2Api.extends).toEqual(['oAuth2Api']);

		const grantType = databricksOAuth2Api.properties.find((p) => p.name === 'grantType');
		expect(grantType?.default).toBe('clientCredentials');

		const accessTokenUrl = databricksOAuth2Api.properties.find((p) => p.name === 'accessTokenUrl');
		expect(accessTokenUrl?.default).toContain('/oidc/v1/token');
	});

	describe('tokenExpiredStatusCode', () => {
		const field = databricksOAuth2Api.properties.find((p) => p.name === 'tokenExpiredStatusCode');

		it('should be declared so it reaches the decrypted credential', () => {
			expect(field).toBeDefined();
		});

		it('should default to 403 for Databricks', () => {
			expect(field?.default).toBe(403);
		});

		it('should be a configurable number field', () => {
			expect(field?.type).toBe('number');
			expect(field?.type).not.toBe('hidden');
		});
	});
});
