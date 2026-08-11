import type { INodeProperties } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { AtlassianOAuth2Api } from '../AtlassianOAuth2Api.credentials';
import { JiraSoftwareCloudOAuth2Api } from '../JiraSoftwareCloudOAuth2Api.credentials';
import { OAuth2Api } from '../OAuth2Api.credentials';

describe('JiraSoftwareCloudOAuth2Api Credential', () => {
	const jiraOAuth2Api = new JiraSoftwareCloudOAuth2Api();
	const defaultScopes = [
		'read:jira-user',
		'read:jira-work',
		'write:jira-work',
		'manage:jira-webhook',
		'offline_access',
	];

	it('should have correct credential metadata', () => {
		expect(jiraOAuth2Api.name).toBe('jiraSoftwareCloudOAuth2Api');
		expect(jiraOAuth2Api.extends).toEqual(['atlassianOAuth2Api']);

		const enabledScopesProperty = jiraOAuth2Api.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.default).toBe(defaultScopes.join(' '));
	});

	it('should resolve the extends chain', () => {
		const resolved: INodeProperties[] = [];
		NodeHelpers.mergeNodeProperties(resolved, new OAuth2Api().properties);
		NodeHelpers.mergeNodeProperties(resolved, new AtlassianOAuth2Api().properties);
		NodeHelpers.mergeNodeProperties(resolved, jiraOAuth2Api.properties);

		const byName = (name: string) => resolved.find((p) => p.name === name);

		const domain = byName('domain');
		expect(domain?.type).toBe('string');
		expect(domain?.required).toBe(true);
		expect(domain?.displayName).toBe('Site URL');

		expect(byName('grantType')?.default).toBe('authorizationCode');
		expect(byName('authUrl')?.default).toBe('https://auth.atlassian.com/authorize');
		expect(byName('accessTokenUrl')?.default).toBe('https://auth.atlassian.com/oauth/token');
		expect(byName('authQueryParameters')?.default).toBe(
			'audience=api.atlassian.com&prompt=consent',
		);
		expect(byName('authentication')?.default).toBe('header');
		expect(byName('customScopes')?.default).toBe(false);
		expect(byName('enabledScopes')?.default).toBe(defaultScopes.join(' '));

		const scope = byName('scope');
		expect(scope?.type).toBe('hidden');
		expect(scope?.default).toBe(
			'={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
		);
	});
});
