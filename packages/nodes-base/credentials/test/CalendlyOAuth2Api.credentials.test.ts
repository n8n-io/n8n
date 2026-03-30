import { CalendlyOAuth2Api } from '../CalendlyOAuth2Api.credentials';

describe('CalendlyOAuth2Api Credential', () => {
	const calendlyOAuth2Api = new CalendlyOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(calendlyOAuth2Api.name).toBe('calendlyOAuth2Api');
		expect(calendlyOAuth2Api.displayName).toBe('Calendly OAuth2 API');
	});

	it('should have the correct default scopes', () => {
		const scopeProperty = calendlyOAuth2Api.properties.find((p) => p.name === 'scope');
		expect(scopeProperty).toBeDefined();
		expect(scopeProperty?.default).toBe(
			'user:read bookings:read bookings:manage webhooks:read webhooks:write',
		);
	});

	it('should define the webhookSigningKey property as an optional password', () => {
		const webhookSigningKeyProperty = calendlyOAuth2Api.properties.find(
			(p) => p.name === 'webhookSigningKey',
		);
		expect(webhookSigningKeyProperty).toBeDefined();
		expect(webhookSigningKeyProperty?.type).toBe('string');
		expect(webhookSigningKeyProperty?.typeOptions?.password).toBe(true);
	});
});
