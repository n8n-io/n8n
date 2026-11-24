import type { INodeProperties } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { AtlassianOAuth2Api } from '../AtlassianOAuth2Api.credentials';
import { OAuth2Api } from '../OAuth2Api.credentials';

describe('AtlassianOAuth2Api Credential', () => {
	const atlassianOAuth2Api = new AtlassianOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(atlassianOAuth2Api.name).toBe('atlassianOAuth2Api');
		expect(atlassianOAuth2Api.extends).toEqual(['oAuth2Api']);

		// No site field on the base: Confluence picks the site on the node, and
		// Jira defines its own `domain` property.
		expect(atlassianOAuth2Api.properties.find((p) => p.name === 'domain')).toBeUndefined();

		const authUrlProperty = atlassianOAuth2Api.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://auth.atlassian.com/authorize');

		const accessTokenUrlProperty = atlassianOAuth2Api.properties.find(
			(p) => p.name === 'accessTokenUrl',
		);
		expect(accessTokenUrlProperty?.default).toBe('https://auth.atlassian.com/oauth/token');

		const authQueryParamsProperty = atlassianOAuth2Api.properties.find(
			(p) => p.name === 'authQueryParameters',
		);
		expect(authQueryParamsProperty?.default).toBe('audience=api.atlassian.com&prompt=consent');

		const authenticationProperty = atlassianOAuth2Api.properties.find(
			(p) => p.name === 'authentication',
		);
		expect(authenticationProperty?.default).toBe('header');

		const grantTypeProperty = atlassianOAuth2Api.properties.find((p) => p.name === 'grantType');
		expect(grantTypeProperty?.default).toBe('authorizationCode');
	});

	it('should leave the inherited scope field visible and editable', () => {
		expect(atlassianOAuth2Api.properties.find((p) => p.name === 'scope')).toBeUndefined();
		expect(atlassianOAuth2Api.properties.find((p) => p.name === 'customScopes')).toBeUndefined();
		expect(atlassianOAuth2Api.properties.find((p) => p.name === 'enabledScopes')).toBeUndefined();

		const resolved: INodeProperties[] = [];
		NodeHelpers.mergeNodeProperties(resolved, new OAuth2Api().properties);
		NodeHelpers.mergeNodeProperties(resolved, atlassianOAuth2Api.properties);

		const scope = resolved.find((p) => p.name === 'scope');
		expect(scope?.type).toBe('string');
		expect(scope?.default).toBe('');
	});
});
