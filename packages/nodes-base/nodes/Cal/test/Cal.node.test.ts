import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const BASE_URL = 'https://api.cal.com';

const credentials = {
	calApi: {
		apiKey: 'test-api-key',
		host: BASE_URL,
	},
};

const bookingOne = {
	uid: 'bk_one',
	title: '30 Min Meeting between Tai and Ada',
	status: 'upcoming',
	start: '2026-09-01T01:00:00.000Z',
	end: '2026-09-01T01:30:00.000Z',
	attendees: [{ name: 'Ada Lovelace', email: 'ada@example.com' }],
};

const bookingTwo = {
	uid: 'bk_two',
	title: 'Intro Call between Tai and Grace',
	status: 'upcoming',
	start: '2026-09-02T03:00:00.000Z',
	end: '2026-09-02T03:30:00.000Z',
	attendees: [{ name: 'Grace Hopper', email: 'grace@example.com' }],
};

describe('Cal.com Node', () => {
	describe('Booking', () => {
		beforeEach(() => {
			// `take` comes from the Limit field; `skip` is absent because
			// pagination is off when Return All is false.
			nock(BASE_URL)
				.get('/v2/bookings')
				.query({ status: 'upcoming', take: '2' })
				.matchHeader('cal-api-version', '2024-08-13')
				.reply(200, {
					status: 'success',
					data: [bookingOne, bookingTwo],
					pagination: { totalItems: 2, remainingItems: 0 },
				});

			// Return All switches on offset pagination, which sends the page size
			// as `take` and starts at `skip=0`. A short page ends the run.
			nock(BASE_URL)
				.get('/v2/bookings')
				.query({ status: 'upcoming', take: '100', skip: '0' })
				.matchHeader('cal-api-version', '2024-08-13')
				.reply(200, {
					status: 'success',
					data: [bookingOne, bookingTwo],
					pagination: { totalItems: 2, remainingItems: 0 },
				});

			nock(BASE_URL)
				.get('/v2/bookings/bk_one')
				.matchHeader('cal-api-version', '2024-08-13')
				.reply(200, { status: 'success', data: bookingOne });

			nock(BASE_URL)
				.post('/v2/bookings/bk_one/cancel', { cancellationReason: 'Rescheduling' })
				.matchHeader('cal-api-version', '2024-08-13')
				.reply(200, {
					status: 'success',
					data: { uid: 'bk_one', status: 'cancelled', cancellationReason: 'Rescheduling' },
				});
		});

		new NodeTestHarness().setupTests({
			workflowFiles: [
				'getAllBookings.workflow.json',
				'getAllBookingsReturnAll.workflow.json',
				'getBooking.workflow.json',
				'cancelBooking.workflow.json',
			],
			credentials,
		});
	});

	describe('Self-hosted host with a trailing slash', () => {
		beforeEach(() => {
			nock(BASE_URL)
				.get('/v2/bookings/bk_one')
				.matchHeader('cal-api-version', '2024-08-13')
				.reply(200, { status: 'success', data: bookingOne });
		});

		// `/v2` is appended to the credential host, so a host saved with a
		// trailing slash would request `//v2/bookings/...` without the strip.
		new NodeTestHarness().setupTests({
			workflowFiles: ['getBookingTrailingSlashHost.workflow.json'],
			credentials: {
				calApi: {
					apiKey: 'test-api-key',
					host: `${BASE_URL}/`,
				},
			},
		});
	});

	describe('Event Type', () => {
		beforeEach(() => {
			// `/event-types` rejects the 2024-08-13 stamp that `/bookings` requires,
			// so the version header is pinned separately here.
			nock(BASE_URL)
				.get('/v2/event-types')
				.query({ username: 'tai' })
				.matchHeader('cal-api-version', '2024-06-14')
				.reply(200, {
					status: 'success',
					data: [
						{ id: 1001, title: '30 Min Meeting', slug: '30min', lengthInMinutes: 30 },
						{ id: 1002, title: '60 Min Meeting', slug: '60min', lengthInMinutes: 60 },
					],
				});
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['getAllEventTypes.workflow.json'],
			credentials,
		});
	});
});
