import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const premium = nock('https://api.example.com').get('/premium').reply(200, { plan: 'premium' });
	const basic = nock('https://api.example.com').get('/basic').reply(200, { plan: 'basic' });
	const notify = nock('https://api.example.com').post('/notify').reply(200, { sent: true });
	return [premium, basic, notify];
}
