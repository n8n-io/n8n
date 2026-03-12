import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const qr = nock('https://api.qrserver.com')
		.get(/\/v1\/create-qr-code\//)
		.reply(200, { qr_code: 'base64data' });
	return [qr];
}
