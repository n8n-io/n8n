'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const posthog_node_1 = require('posthog-node');
const posthog_1 = require('@/posthog');
jest.mock('posthog-node');
describe('PostHog', () => {
	const instanceId = 'test-id';
	const userId = 'distinct-id';
	const apiKey = 'api-key';
	const apiHost = 'api-host';
	const instanceSettings = (0, backend_test_utils_1.mockInstance)(n8n_core_1.InstanceSettings, {
		instanceId,
	});
	const globalConfig = (0, jest_mock_extended_1.mock)({ logging: { level: 'debug' } });
	beforeAll(() => {
		globalConfig.diagnostics.posthogConfig = { apiKey, apiHost };
	});
	beforeEach(() => {
		globalConfig.diagnostics.enabled = true;
		jest.resetAllMocks();
	});
	it('inits PostHog correctly', async () => {
		const ph = new posthog_1.PostHogClient(instanceSettings, globalConfig);
		await ph.init();
		expect(posthog_node_1.PostHog.prototype.constructor).toHaveBeenCalledWith(apiKey, {
			host: apiHost,
		});
	});
	it('does not initialize or track if diagnostics are not enabled', async () => {
		globalConfig.diagnostics.enabled = false;
		const ph = new posthog_1.PostHogClient(instanceSettings, globalConfig);
		await ph.init();
		ph.track({
			userId: 'test',
			event: 'test',
			properties: {},
		});
		expect(posthog_node_1.PostHog.prototype.constructor).not.toHaveBeenCalled();
		expect(posthog_node_1.PostHog.prototype.capture).not.toHaveBeenCalled();
	});
	it('captures PostHog events', async () => {
		const event = 'test event';
		const properties = {
			user_id: 'test',
			test: true,
		};
		const ph = new posthog_1.PostHogClient(instanceSettings, globalConfig);
		await ph.init();
		ph.track({
			userId,
			event,
			properties,
		});
		expect(posthog_node_1.PostHog.prototype.capture).toHaveBeenCalledWith({
			distinctId: userId,
			event,
			userId,
			properties,
			sendFeatureFlags: true,
		});
	});
	it('gets feature flags', async () => {
		const createdAt = new Date();
		const ph = new posthog_1.PostHogClient(instanceSettings, globalConfig);
		await ph.init();
		await ph.getFeatureFlags({
			id: userId,
			createdAt,
		});
		expect(posthog_node_1.PostHog.prototype.getAllFlags).toHaveBeenCalledWith(
			`${instanceId}#${userId}`,
			{
				personProperties: {
					created_at_timestamp: createdAt.getTime().toString(),
				},
			},
		);
	});
});
//# sourceMappingURL=posthog.test.js.map
