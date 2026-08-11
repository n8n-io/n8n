import { ConfluenceCloudOAuth2Api } from '../ConfluenceCloudOAuth2Api.credentials';

describe('ConfluenceCloudOAuth2Api Credential', () => {
	const confluenceOAuth2Api = new ConfluenceCloudOAuth2Api();
	const defaultScopes = [
		'read:page:confluence',
		'write:page:confluence',
		'read:hierarchical-content:confluence',
		'read:space:confluence',
		'read:attachment:confluence',
		'read:comment:confluence',
		'read:label:confluence',
		'read:content-details:confluence',
		'write:attachment:confluence',
		'delete:attachment:confluence',
		'write:comment:confluence',
		'delete:comment:confluence',
		'write:label:confluence',
		'delete:page:confluence',
		'offline_access',
	];

	it('should have correct credential metadata', () => {
		expect(confluenceOAuth2Api.name).toBe('confluenceCloudOAuth2Api');
		expect(confluenceOAuth2Api.extends).toEqual(['atlassianOAuth2Api']);

		const enabledScopesProperty = confluenceOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.default).toBe(defaultScopes.join(' '));

		const scopeProperty = confluenceOAuth2Api.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toContain(defaultScopes.join(' '));
	});

	it('should inherit the Site URL field from atlassianOAuth2Api', () => {
		// The field lives on the base (asserted in AtlassianOAuth2Api.credentials.test.ts);
		// the credential must not shadow it with its own definition
		expect(confluenceOAuth2Api.properties.find((p) => p.name === 'domain')).toBeUndefined();
		expect(confluenceOAuth2Api.properties.find((p) => p.name === 'siteUrl')).toBeUndefined();
	});

	it('should test the connection against accessible-resources', () => {
		expect(confluenceOAuth2Api.test).toEqual({
			request: {
				baseURL: 'https://api.atlassian.com',
				url: '/oauth/token/accessible-resources',
				method: 'GET',
			},
		});
	});
});
