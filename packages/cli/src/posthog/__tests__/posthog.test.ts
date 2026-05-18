import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { FeatureFlags } from 'n8n-workflow';
import { PostHog } from 'posthog-node';

import { PostHogClient } from '@/posthog';

jest.mock('posthog-node');

function mockEvaluatedFlags(flags: FeatureFlags) {
	return {
		keys: Object.keys(flags),
		getFlag: (key: string) => flags[key],
	};
}

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

			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledWith(`${instanceId}#${userId}`, {
				personProperties: {
					created_at_timestamp: createdAt.getTime().toString(),
				},
				groups: { company: instanceId },
			});
		});

		it('returns cached flags on second call', async () => {
			const flags = { 'test-flag': true };
			(PostHog.prototype.evaluateFlags as jest.Mock).mockResolvedValue(mockEvaluatedFlags(flags));

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			const first = await ph.getFeatureFlags({ id: userId, createdAt });
			const second = await ph.getFeatureFlags({ id: userId, createdAt });

			expect(first).toEqual(flags);
			expect(second).toEqual(flags);
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(1);
		});

		it('refetches after cache expires', async () => {
			const flags = { 'test-flag': true };
			(PostHog.prototype.evaluateFlags as jest.Mock).mockResolvedValue(mockEvaluatedFlags(flags));

			const now = Date.now();
			const spy = jest.spyOn(Date, 'now').mockReturnValue(now);

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await ph.getFeatureFlags({ id: userId, createdAt });
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(1);

			spy.mockReturnValue(now + 10 * 60 * 1000 + 1);

			await ph.getFeatureFlags({ id: userId, createdAt });
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(2);

			spy.mockRestore();
		});

		it('does not cache empty results', async () => {
			(PostHog.prototype.evaluateFlags as jest.Mock).mockResolvedValue(mockEvaluatedFlags({}));

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await ph.getFeatureFlags({ id: userId, createdAt });
			await ph.getFeatureFlags({ id: userId, createdAt });

			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(2);
		});

		describe('env-var overrides', () => {
			afterEach(() => {
				// Mutated per test; reset so test ordering doesn't leak override
				// state into unrelated cases.
				globalConfig.evaluation.collectionsEnabled = false;
			});

			it('force-enables the eval-collections flag when N8N_EVAL_COLLECTIONS_ENABLED is set', async () => {
				(PostHog.prototype.getAllFlags as jest.Mock).mockResolvedValue({});
				globalConfig.evaluation.collectionsEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({ '084_eval_collections': true });
			});

			it('leaves flags untouched when no override is configured', async () => {
				(PostHog.prototype.getAllFlags as jest.Mock).mockResolvedValue({ 'some-other-flag': true });

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({ 'some-other-flag': true });
			});

			it('falls back to env overrides when PostHog throws', async () => {
				(PostHog.prototype.getAllFlags as jest.Mock).mockRejectedValue(new Error('posthog down'));
				globalConfig.evaluation.collectionsEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({ '084_eval_collections': true });
			});
		});
	});
});
