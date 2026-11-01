import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test Cal.com, slot => getMany', () => {
	nock('https://api.cal.com')
		.get('/v2/slots')
		.query({
			eventTypeId: '1234',
			start: '2033-09-05',
			end: '2033-09-06',
		})
		.reply(200, {
			status: 'success',
			data: {
				'2033-09-05': [
					{ start: '2033-09-05T10:00:00+02:00', end: '2033-09-05T10:30:00+02:00' },
					{ start: '2033-09-05T11:00:00+02:00', end: '2033-09-05T11:30:00+02:00' },
				],
				'2033-09-06': [{ start: '2033-09-06T09:00:00+02:00', end: '2033-09-06T09:30:00+02:00' }],
			},
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getMany.workflow.json'],
		credentials: {
			calApi: { apiKey: 'cal_test_key', host: 'https://api.cal.com' },
		},
	});
});
