import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { IntercomOAuth2Api } from '../IntercomOAuth2Api.credentials';

describe('IntercomOAuth2Api Credential', () => {
	const credential = new IntercomOAuth2Api();
	const getDefault = (name: string) => credential.properties.find((p) => p.name === name)?.default;

	const authorizationUri = 'https://app.intercom.com/oauth';
	const accessTokenUri = 'https://api.intercom.io/auth/eagle/token';
	const redirectUri = 'http://localhost:5678/rest/oauth2-credential/callback';

	const createOAuthClient = () =>
		new ClientOAuth2({
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			accessTokenUri,
			authorizationUri,
			redirectUri,
		});

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('intercomOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);
		expect(getDefault('grantType')).toBe('authorizationCode');
		expect(getDefault('authUrl')).toBe(authorizationUri);
		expect(getDefault('accessTokenUrl')).toBe(accessTokenUri);
		expect(getDefault('scope')).toBe('');
		expect(getDefault('authentication')).toBe('body');
	});

	it('should build an authorization URI without a scope', () => {
		const uri = new URL(createOAuthClient().code.getUri());

		expect(uri.origin + uri.pathname).toBe(authorizationUri);
		expect(uri.searchParams.get('client_id')).toBe('test-client-id');
		expect(uri.searchParams.get('response_type')).toBe('code');
		expect(uri.searchParams.has('scope')).toBe(false);
	});

	it('should exchange the code for a token', async () => {
		nock('https://api.intercom.io')
			.post('/auth/eagle/token', (body: Record<string, unknown>) => {
				return body.code === 'test-code' && body.grant_type === 'authorization_code';
			})
			.reply(200, { access_token: 'test-access-token', token_type: 'Bearer' });

		const token = await createOAuthClient().code.getToken(
			`${redirectUri}?code=test-code&state=abc`,
			{ state: 'abc' },
		);

		expect(token.accessToken).toBe('test-access-token');
	});
});
