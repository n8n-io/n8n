import { SlackManagerOAuth2Api } from '../SlackManagerOAuth2Api.credentials';

describe('SlackManagerOAuth2Api Credential', () => {
	const credential = new SlackManagerOAuth2Api();

	it('uses the dedicated manager credential type and configured user scopes', () => {
		expect(credential.name).toBe('slackManagerOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);
		expect(credential.properties.find(({ name }) => name === 'authUrl')?.default).toBe(
			'https://slack.com/oauth/v2/authorize',
		);
		expect(credential.properties.find(({ name }) => name === 'accessTokenUrl')?.default).toBe(
			'https://slack.com/api/oauth.v2.access',
		);
		expect(credential.properties.find(({ name }) => name === 'authQueryParameters')?.default).toBe(
			'={{"user_scope=app_configurations:read app_configurations:write managed_apps:install"}}',
		);
	});
});
