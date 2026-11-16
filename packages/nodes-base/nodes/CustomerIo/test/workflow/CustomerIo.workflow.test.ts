import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const campaign = { id: 15, name: 'Welcome' };
const credentialData = {
	trackingApiKey: 'fake-tracking-key',
	trackingSiteId: 'fake-site-id',
	appApiKey: 'fake-app-key',
};

describe('Customer.io > Workflows', () => {
	describe('Global region', () => {
		beforeAll(() => {
			const app = nock('https://api.customer.io/v1');
			app.get('/campaigns/15').reply(200, { campaign });
			app.get('/campaigns').reply(200, { campaigns: [campaign] });
			app
				.get('/campaigns/15/metrics')
				.query({ period: 'weeks' })
				.reply(200, { metric: { sent: [3] } });

			const tracking = nock('https://track.customer.io/api/v1');
			tracking.put('/customers/nathan@example.com', { email: 'nathan@example.com' }).reply(200, {});
			tracking.delete('/customers/cus_8812').reply(200, {});
			tracking.post('/customers/cus_8812/events').reply(200, {});
			tracking.post('/events').reply(200, {});
			tracking.post('/segments/7/add_customers').reply(200, {});
			tracking.post('/segments/7/remove_customers').reply(200, {});
		});

		afterAll(() => {
			expect(nock.isDone()).toBe(true);
		});

		new NodeTestHarness().setupTests({
			credentials: { customerIoApi: { ...credentialData, region: 'track.customer.io' } },
			workflowFiles: ['requests.workflow.json'],
		});
	});

	describe('EU region', () => {
		beforeAll(() => {
			nock('https://api-eu.customer.io/v1').get('/campaigns/15').reply(200, { campaign });
			nock('https://track-eu.customer.io/api/v1').delete('/customers/cus_8812').reply(200, {});
		});

		afterAll(() => {
			expect(nock.isDone()).toBe(true);
		});

		new NodeTestHarness().setupTests({
			credentials: { customerIoApi: { ...credentialData, region: 'track-eu.customer.io' } },
			workflowFiles: ['requests.eu.workflow.json'],
		});
	});
});
