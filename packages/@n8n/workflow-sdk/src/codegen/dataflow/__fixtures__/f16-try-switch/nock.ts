import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com')
		.get('/data')
		.reply(200, { type: 'sms', message: 'Hello' });
	const sms = nock('https://sms.example.com').post('/send').reply(200, { success: true });
	return [api, sms];
}
