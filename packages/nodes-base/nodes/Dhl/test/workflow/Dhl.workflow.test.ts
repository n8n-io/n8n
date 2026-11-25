import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('DHL > Workflows', () => {
	beforeAll(() => {
		nock('https://api-eu.dhl.com')
			.get('/track/shipments')
			.query({ trackingNumber: '00340434292135100186' })
			.matchHeader('dhl-api-key', 'fake-api-key')
			.reply(200, { shipments: [{ id: '00340434292135100186', service: 'parcel-de' }] });
	});

	new NodeTestHarness().setupTests({
		credentials: { dhlApi: { apiKey: 'fake-api-key' } },
		workflowFiles: ['requests.workflow.json'],
	});
});
