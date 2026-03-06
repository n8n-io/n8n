import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /n8n/latest → npm registry response
	const s1 = nock('https://registry.npmjs.org')
		.get('/n8n/latest')
		.reply(200, { version: '1.62.1', name: 'n8n' });

	// GET /rest/settings → n8n local API (http, not https)
	const s2 = nock('http://0.0.0.0:5678')
		.get('/rest/settings')
		.reply(200, { data: { versionCli: '1.61.0' } });

	// POST /api/exec → update trigger
	const s3 = nock('https://my-server')
		.post('/api/exec')
		.reply(200, { success: true, message: 'Update initiated' });

	return [s1, s2, s3];
}
