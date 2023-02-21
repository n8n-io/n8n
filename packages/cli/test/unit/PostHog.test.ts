import { PostHog } from 'posthog-node';
import { PostHogClient } from '@/posthog';
import config from '@/config';

jest.mock('posthog-node');

describe('PostHog', () => {
	const instanceId = 'test-id';
	const userId = 'distinct-id';
	const apiKey = 'api-key';
	const apiHost = 'api-host';

	beforeAll(() => {
		config.set('diagnostics.config.posthog.apiKey', apiKey);
		config.set('diagnostics.config.posthog.apiHost', apiHost);
	});

	beforeEach(() => {
		config.set('diagnostics.enabled', true);
		jest.resetAllMocks();
	});

	it('inits PostHog correctly', async () => {
		const ph = new PostHogClient();
		await ph.init(instanceId);

		expect(PostHog.prototype.constructor).toHaveBeenCalledWith(apiKey, {host: apiHost});
	});

	it('does not initialize or track if diagnostics are not enabled', async () => {
		config.set('diagnostics.enabled', false);

		const ph = new PostHogClient();
		await ph.init(instanceId);

		ph.track({
			userId: 'test',
			event: 'test',
			properties: {},
		});

		expect(PostHog.prototype.constructor).not.toHaveBeenCalled();
		expect(PostHog.prototype.capture).not.toHaveBeenCalled();
	});

	it('captures PostHog events', async () => {
		const event = 'test event';
		const properties = {
			user_id: 'test',
			test: true,
		};

		const ph = new PostHogClient();
		await ph.init(instanceId);

		ph.track({
			userId,
			event,
			properties,
		});

		expect(PostHog.prototype.capture).toHaveBeenCalledWith({
			distinctId: userId,
			event,
			userId,
			properties,
			sendFeatureFlags: true,
		});
	});

	it('gets feature flags', async () => {
		const createdAt = new Date();
		const ph = new PostHogClient();
		await ph.init(instanceId);

		ph.getFeatureFlags({
			id: userId,
			createdAt,
		});

		expect(PostHog.prototype.getAllFlags).toHaveBeenCalledWith(
			`${instanceId}#${userId}`,
			{
				personProperties: {
					created_at_timestamp: createdAt.getTime().toString(),
				},
			}
		);
	});
});