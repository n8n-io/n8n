import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	customerIoApi: {
		trackingSiteId: 'test-site-id',
		trackingApiKey: 'test-api-key',
		appApiKey: 'test-app-api-key',
		region: 'track.customer.io',
	},
};

describe('Customer.io Node', () => {
	beforeAll(() => nock.disableNetConnect());
	afterAll(() => nock.enableNetConnect());

	const trackingNock = nock('https://track.customer.io');
	const apiNock = nock('https://api.customer.io');

	// ── customer ──────────────────────────────────────────────────────────────
	describe('customer', () => {
		beforeAll(() => {
			trackingNock
				.put('/api/v1/customers/1', { email: 'test@example.com' })
				.reply(200, {})
				.delete('/api/v1/customers/1')
				.reply(200, {});
			apiNock
				.get('/v1/customers')
				.query({ email: 'test@example.com' })
				.reply(200, { results: [{ id: '1', email: 'test@example.com' }] });
		});

		afterAll(() => {
			trackingNock.done();
			apiNock.done();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['customer.workflow.json'],
		});
	});

	// ── event ─────────────────────────────────────────────────────────────────
	describe('event', () => {
		beforeAll(() => {
			trackingNock
				.post('/api/v1/customers/1/events', { name: 'signup', data: {} })
				.reply(200, {})
				.post('/api/v1/events', { name: 'page_view', data: {} })
				.reply(200, {});
		});

		afterAll(() => trackingNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['event.workflow.json'],
		});
	});

	// ── campaign ──────────────────────────────────────────────────────────────
	describe('campaign', () => {
		beforeAll(() => {
			apiNock
				.get('/v1/campaigns/1')
				.reply(200, { campaign: { id: 1, name: 'Test Campaign', active: true } })
				.get('/v1/campaigns')
				.reply(200, {
					campaigns: [
						{ id: 1, name: 'Campaign 1' },
						{ id: 2, name: 'Campaign 2' },
					],
				})
				.get('/v1/campaigns/1/metrics')
				.reply(200, { metric: { period: 'days', steps: 5, data: [] } });
		});

		afterAll(() => apiNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['campaign.workflow.json'],
		});
	});

	// ── segment ───────────────────────────────────────────────────────────────
	describe('segment', () => {
		beforeAll(() => {
			trackingNock
				.post('/api/v1/segments/1/add_customers', { id: 1, ids: ['2', '3'] })
				.reply(200, {})
				.post('/api/v1/segments/1/remove_customers', { id: 1, ids: ['2', '3'] })
				.reply(200, {});
		});

		afterAll(() => trackingNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['segment.workflow.json'],
		});
	});
});
