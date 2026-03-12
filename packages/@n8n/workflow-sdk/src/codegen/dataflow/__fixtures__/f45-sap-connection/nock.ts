import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const login = nock('https://sap.example.com')
		.post('/b1s/v1/Login')
		.reply(200, { SessionId: 'abc-123-session' });
	return [login];
}
