import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const process = nock('https://api.example.com').post('/process').reply(200, { processed: true });
	return [process];
}
