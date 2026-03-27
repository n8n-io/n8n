import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import { PostHog } from 'posthog-node';

import { PostHogClient } from '@/posthog';

jest.mock('posthog-node');

describe('PostHog', () => {
	const instanceId = 'test-id';
	const userId = 'distinct-id';
	const apiKey = 'api-key';
	const apiHost = 'api-host';

	const instanceSettings = mockInstance(InstanceSettings, { instanceId });

	const globalConfig = mock<GlobalConfig>({ logging: { level: 'debug' } });

	beforeAll(() => {
		globalConfig.diagnostics.posthogConfig = { apiKey, apiHost };
	});

	beforeEach(() => {
		globalConfig.diagnostics.enabled = true;
		jest.resetAllMocks();
	});

	it('inits PostHog correctly', async () => {
		const ph = new PostHogClient(instanceSettings, globalConfig);
		await ph.init();

		expect(PostHog.prototype.constructor).toHaveBeenCalledWith(apiKey, { host: apiHost });
	});

	it('does not initialize or track if diagnostics are not enabled', async () => {
		globalConfig.diagnostics.enabled = false;

		const ph = new PostHogClient(instanceSettings, globalConfig);
		await ph.init();

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

		const ph = new PostHogClient(instanceSettings, globalConfig);
		await ph.init();

		ph.track({
			userId,
			event,
			properties,
		});

		expect(PostHog.prototype.capture).toHaveBeenCalledWith({
			distinctId: userId,
			event,
			properties,
			sendFeatureFlags: true,
		});
	});

	it('sends $groupidentify event with instance group', async () => {
		const properties = { name: 'test-instance' } as Record<string, string | number>;

		const ph = new PostHogClient(instanceSettings, globalConfig);
		await ph.init();

		ph.groupIdentify({ instanceId, properties });

		expect(PostHog.prototype.capture).toHaveBeenCalledWith({
			distinctId: instanceId,
			event: '$groupidentify',
			sendFeatureFlags: true,
			properties: {
				$group_type: 'company',
				$group_key: instanceId,
				$group_set: properties,
			},
			groups: { company: instanceId },
		});
	});

	describe('getFeatureFlags', () => {
		const createdAt = new Date();

		it('fetches flags from PostHog on first call', async () => {
			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await ph.getFeatureFlags({ id: userId, createdAt });

			expect(PostHog.prototype.getAllFlags).toHaveBeenCalledWith(`${instanceId}#${userId}`, {
				personProperties: {
					created_at_timestamp: createdAt.getTime().toString(),
				},
				groups: { company: instanceId },
			});
		});

		it('returns cached flags on second call', async () => {
			const mockFlags = { 'test-flag': true };
			(PostHog.prototype.getAllFlags as jest.Mock).mockResolvedValue(mockFlags);

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			const first = await ph.getFeatureFlags({ id: userId, createdAt });
			const second = await ph.getFeatureFlags({ id: userId, createdAt });

			expect(first).toEqual(mockFlags);
			expect(second).toEqual(mockFlags);
			expect(PostHog.prototype.getAllFlags).toHaveBeenCalledTimes(1);
		});

		it('refetches after cache expires', async () => {
			const mockFlags = { 'test-flag': true };
			(PostHog.prototype.getAllFlags as jest.Mock).mockResolvedValue(mockFlags);

			const now = Date.now();
			const spy = jest.spyOn(Date, 'now').mockReturnValue(now);

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await ph.getFeatureFlags({ id: userId, createdAt });
			expect(PostHog.prototype.getAllFlags).toHaveBeenCalledTimes(1);

			spy.mockReturnValue(now + 10 * 60 * 1000 + 1);

			await ph.getFeatureFlags({ id: userId, createdAt });
			expect(PostHog.prototype.getAllFlags).toHaveBeenCalledTimes(2);

			spy.mockRestore();
		});

		it('does not cache empty results', async () => {
			(PostHog.prototype.getAllFlags as jest.Mock).mockResolvedValue({});

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await ph.getFeatureFlags({ id: userId, createdAt });
			await ph.getFeatureFlags({ id: userId, createdAt });

			expect(PostHog.prototype.getAllFlags).toHaveBeenCalledTimes(2);
		});
	});
});
