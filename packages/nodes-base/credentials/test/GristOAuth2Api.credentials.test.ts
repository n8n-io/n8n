import { GristOAuth2Api } from '../GristOAuth2Api.credentials';

describe('GristOAuth2Api Credential', () => {
	const credential = new GristOAuth2Api();
	const property = (name: string) => credential.properties.find((p) => p.name === name);

	it('should extend the generic OAuth2 credential', () => {
		expect(credential.name).toBe('gristOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);
	});

	it('should use the PKCE grant, which is what Grist supports', () => {
		expect(property('grantType')?.default).toBe('pkce');
	});

	it('should default to hosted Grist and require a URL', () => {
		expect(property('url')?.default).toBe('https://api.getgrist.com');
		expect(property('url')?.required).toBe(true);
	});

	it('should prompt for consent, so a refresh token is issued', () => {
		expect(property('authQueryParameters')?.default).toBe('prompt=consent');
	});

	// A token keeps the scopes it was granted, so this list cannot be widened after the fact.
	it('should request read, write, webhook and offline access', () => {
		expect(property('scope')?.default).toBe('offline_access doc:read doc:write doc:webhooks');
	});
});
