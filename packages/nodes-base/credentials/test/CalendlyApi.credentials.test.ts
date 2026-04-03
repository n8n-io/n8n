import { CalendlyApi } from '../CalendlyApi.credentials';

describe('CalendlyApi Credential', () => {
	const calendlyApi = new CalendlyApi();

	it('should have correct credential metadata', () => {
		expect(calendlyApi.name).toBe('calendlyApi');
		expect(calendlyApi.displayName).toBe('Calendly API (Personal Access Token)');
		expect(calendlyApi.test.request.baseURL).toBe('https://api.calendly.com');
		expect(calendlyApi.test.request.url).toBe('/users/me');
	});

	it('should define access token and webhook signing key properties', () => {
		const accessTokenProperty = calendlyApi.properties.find(
			(property) => property.name === 'accessToken',
		);
		const webhookSigningKeyProperty = calendlyApi.properties.find(
			(property) => property.name === 'webhookSigningKey',
		);

		expect(accessTokenProperty).toBeDefined();
		expect(accessTokenProperty?.required).toBe(true);
		expect(webhookSigningKeyProperty).toBeDefined();
		expect(webhookSigningKeyProperty?.type).toBe('string');
		expect(webhookSigningKeyProperty?.typeOptions?.password).toBe(true);
	});
});
