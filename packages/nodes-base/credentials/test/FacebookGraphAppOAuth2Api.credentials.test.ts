import { FacebookGraphAppOAuth2Api } from '../FacebookGraphAppOAuth2Api.credentials';

describe('FacebookGraphAppOAuth2Api Credential', () => {
	const credential = new FacebookGraphAppOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('facebookGraphAppOAuth2Api');
		expect(credential.extends).toEqual(['facebookGraphApiOAuth2Api']);
	});

	it('should have an optional appSecret property', () => {
		const appSecretProperty = credential.properties.find((p) => p.name === 'appSecret');
		expect(appSecretProperty).toBeDefined();
		expect(appSecretProperty?.type).toBe('string');
		expect(appSecretProperty?.default).toBe('');
	});
});
