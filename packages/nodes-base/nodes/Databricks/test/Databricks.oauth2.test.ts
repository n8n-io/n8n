import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const HOST = 'https://adb-1234567890.1.azuredatabricks.net';

// Isolates the node-level User-Agent: the OAuth2 credential contributes no
// headers under NodeTestHarness (its credentials helper reports no parent types,
// so requestOAuth2 is never reached, and DatabricksOAuth2Api has no `authenticate`
// block). A user-agent on the wire can therefore only come from
// databricksApiRequest(). The request goes out unsigned here, so there is
// deliberately no authorization matcher.
describe('Databricks with OAuth2', () => {
	beforeAll(() => {
		nock(HOST)
			.get('/api/2.1/unity-catalog/catalogs')
			.matchHeader('user-agent', 'n8n_DatabricksNode/1.0')
			.reply(200, { catalogs: [{ name: 'main', comment: 'Main catalog' }] });
	});

	afterAll(() => nock.cleanAll());

	new NodeTestHarness().setupTests({
		credentials: {
			databricksOAuth2Api: {
				host: HOST,
				grantType: 'clientCredentials',
				clientId: 'client-id',
				clientSecret: 'client-secret',
				accessTokenUrl: `${HOST}/oidc/v1/token`,
				scope: 'all-apis',
				authentication: 'header',
				oauthTokenData: { access_token: 'oauth-access-token', token_type: 'Bearer' },
			},
		},
		workflowFiles: ['unity-catalog-oauth2.workflow.json'],
	});
});
