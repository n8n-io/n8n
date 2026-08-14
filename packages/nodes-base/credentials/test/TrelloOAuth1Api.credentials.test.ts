import { TrelloOAuth1Api } from '../TrelloOAuth1Api.credentials';

describe('TrelloOAuth1Api credentials', () => {
	const credential = new TrelloOAuth1Api();

	const getDefault = (name: string) => credential.properties.find((p) => p.name === name)?.default;

	it('extends the generic oAuth1Api credential', () => {
		expect(credential.name).toBe('trelloOAuth1Api');
		expect(credential.extends).toEqual(['oAuth1Api']);
	});

	it('uses Trello OAuth1 endpoints', () => {
		expect(getDefault('requestTokenUrl')).toBe('https://trello.com/1/OAuthGetRequestToken');
		expect(getDefault('accessTokenUrl')).toBe('https://trello.com/1/OAuthGetAccessToken');
		expect(getDefault('signatureMethod')).toBe('HMAC-SHA1');
	});

	it('embeds required Trello query params on the authorization URL', () => {
		const authUrl = getDefault('authUrl') as string;
		expect(authUrl.startsWith('https://trello.com/1/OAuthAuthorizeToken')).toBe(true);

		const params = new URL(authUrl).searchParams;
		expect(params.get('scope')).toBe('read,write,account');
		expect(params.get('expiration')).toBe('never');
		expect(params.get('name')).toBe('n8n');
	});
});
