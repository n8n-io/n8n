import { ZendeskOAuth2Api } from '../ZendeskOAuth2Api.credentials';

describe('ZendeskOAuth2Api Credential', () => {
	const credential = new ZendeskOAuth2Api();
	const defaultScopes = 'read write';

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('zendeskOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);

		// Zendesk builds its OAuth URLs from the user-provided subdomain
		const authUrlProperty = credential.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe(
			'=https://{{$self["subdomain"]}}.zendesk.com/oauth/authorizations/new',
		);

		const accessTokenUrlProperty = credential.properties.find((p) => p.name === 'accessTokenUrl');
		expect(accessTokenUrlProperty?.default).toBe(
			'=https://{{$self["subdomain"]}}.zendesk.com/oauth/tokens',
		);
	});

	it('should use body authentication', () => {
		const authenticationProperty = credential.properties.find((p) => p.name === 'authentication');
		expect(authenticationProperty?.type).toBe('hidden');
		expect(authenticationProperty?.default).toBe('body');
	});

	it('should have custom scopes toggle defaulting to false', () => {
		const customScopesProperty = credential.properties.find((p) => p.name === 'customScopes');
		expect(customScopesProperty?.type).toBe('boolean');
		expect(customScopesProperty?.default).toBe(false);
	});

	it('should have enabledScopes defaulting to the current default scope list', () => {
		const enabledScopesProperty = credential.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.default).toBe(defaultScopes);
	});

	it('should only show enabledScopes when customScopes is true', () => {
		const enabledScopesProperty = credential.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.displayOptions?.show?.customScopes).toEqual([true]);
	});

	it('should only show the custom scopes notice when customScopes is true', () => {
		const noticeProperty = credential.properties.find((p) => p.name === 'customScopesNotice');
		expect(noticeProperty?.type).toBe('notice');
		expect(noticeProperty?.displayOptions?.show?.customScopes).toEqual([true]);
	});

	it('should use enabledScopes when customScopes is true, otherwise fall back to defaults', () => {
		const scopeProperty = credential.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toBe(
			`={{$self["customScopes"] ? $self["enabledScopes"] : "${defaultScopes}"}}`,
		);
	});
});
