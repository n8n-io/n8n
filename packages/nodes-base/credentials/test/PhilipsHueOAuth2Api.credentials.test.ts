import { PhilipsHueOAuth2Api } from '../PhilipsHueOAuth2Api.credentials';

describe('PhilipsHueOAuth2Api Credential', () => {
	const credential = new PhilipsHueOAuth2Api();

	it('should keep the internal name for existing credentials and workflows', () => {
		expect(credential.name).toBe('philipsHueOAuth2Api');
	});

	it('should display the credential as Philips Hue OAuth2 API', () => {
		// NODE-6781: The credential label must use the Philips Hue spelling.
		expect(credential.displayName).toBe('Philips Hue OAuth2 API');
	});
});
