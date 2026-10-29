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

	it('should default custom scopes to off, prefilled with read, write and offline access', () => {
		expect(property('customScopes')?.default).toBe(false);
		expect(property('enabledScopes')?.default).toBe('offline_access doc:read doc:write');
	});

	it('should use enabledScopes when customScopes is true, and fall back to the defaults when off or empty', () => {
		expect(property('scope')?.type).toBe('hidden');
		expect(property('scope')?.default).toBe(
			'={{($self["customScopes"] && $self["enabledScopes"]) ? $self["enabledScopes"] : "offline_access doc:read doc:write"}}',
		);
	});
});
