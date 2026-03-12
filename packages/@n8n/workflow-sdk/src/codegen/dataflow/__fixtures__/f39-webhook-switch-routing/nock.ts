import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const booking = nock('https://api.cal.com')
		.post('/v2/bookings')
		.reply(200, { id: 456, status: 'ACCEPTED' });
	return [booking];
}
