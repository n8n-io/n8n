import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test Cal.com, booking => getMany', () => {
	nock('https://api.cal.com')
		.get('/v2/bookings')
		.query({ status: 'upcoming', limit: '100' })
		.reply(200, {
			status: 'success',
			data: [{ uid: 'bkg_1' }, { uid: 'bkg_2' }],
			pagination: { nextCursor: 'cursor_2', hasMore: true },
		})
		.get('/v2/bookings')
		.query({ status: 'upcoming', limit: '100', cursor: 'cursor_2' })
		.reply(200, {
			status: 'success',
			data: [{ uid: 'bkg_3' }],
			pagination: { nextCursor: null, hasMore: false },
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getMany.workflow.json'],
		credentials: {
			calApi: { apiKey: 'cal_test_key', host: 'https://api.cal.com' },
		},
	});
});
