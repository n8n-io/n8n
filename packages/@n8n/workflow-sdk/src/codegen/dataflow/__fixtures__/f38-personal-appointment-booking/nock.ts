import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const slots = nock('https://api.cal.com')
		.get('/v1/slots')
		.query(true)
		.reply(200, { slots: { '2024-01-15': [{ time: '10:00' }] } });
	const booking = nock('https://api.cal.com')
		.post('/v1/bookings')
		.reply(200, { id: 123, status: 'ACCEPTED' });
	return [slots, booking];
}
