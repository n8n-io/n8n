import { NodeHelpers } from 'n8n-workflow';

import { SlackApi } from '../SlackApi.credentials';

describe('SlackApi Credential', () => {
	const credential = new SlackApi();

	it('should read the connection test base URL from the credential', () => {
		expect(credential.test.request.baseURL).toBe('={{$credentials.url}}');
		expect(credential.test.request.url).toBe('/api/users.profile.get');
	});

	// Credentials saved before the `url` field existed store no value for it.
	// The tester fills defaults in with getNodeParameters before it resolves the request.
	it('should test a stored credential without a url against slack.com', () => {
		const data = NodeHelpers.getNodeParameters(
			credential.properties,
			{ accessToken: 'xoxb-stored' },
			true,
			false,
			null,
			null,
		);

		expect(data).toMatchObject({ accessToken: 'xoxb-stored', url: 'https://slack.com' });
	});
});
