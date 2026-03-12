import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const check1 = nock('https://ssl-checker.io')
		.get(/\/api\/v1\/check\/example\.com/)
		.reply(200, { result: { host: 'example.com', valid_till: '2025-06-15', days_left: 90 } });
	const check2 = nock('https://ssl-checker.io')
		.get(/\/api\/v1\/check\/expiring-soon\.com/)
		.reply(200, { result: { host: 'expiring-soon.com', valid_till: '2024-01-20', days_left: 5 } });
	return [check1, check2];
}
