import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const similar1 = nock('https://api.companyenrich.com')
		.post('/companies/similar')
		.reply(200, {
			items: [{ name: 'Adyen', domain: 'adyen.com', id: '1' }],
			metadata: { scores: { '1': 0.85 } },
		});
	const similar2 = nock('https://api.companyenrich.com')
		.post('/companies/similar')
		.reply(200, {
			items: [{ name: 'Toast', domain: 'toasttab.com', id: '2' }],
			metadata: { scores: { '2': 0.72 } },
		});
	return [similar1, similar2];
}
