import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { Application, Request, RequestHandler, Response } from 'express';
import { InstanceSettings } from 'n8n-core';
import type { FeatureFlags } from 'n8n-workflow';
import { PostHog } from 'posthog-node';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import { PostHogClient } from '@/posthog';

vi.mock('posthog-node');

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
		vi.resetAllMocks();
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
		});
	});

	it('does not capture when userId equals instanceId', async () => {
		const ph = new PostHogClient(instanceSettings, globalConfig);
		await ph.init();

		ph.track({
			userId: instanceId,
			event: 'Instance started',
			properties: { instance_id: instanceId },
		});

		expect(PostHog.prototype.capture).not.toHaveBeenCalled();
	});

	it('does not capture when userId is empty', async () => {
		const ph = new PostHogClient(instanceSettings, globalConfig);
		await ph.init();

		ph.track({
			userId: '',
			event: 'Some event',
			properties: {},
		});

		expect(PostHog.prototype.capture).not.toHaveBeenCalled();
	});

	it('sends $groupidentify event when distinctId is provided', async () => {
		const properties = { name: 'test-instance' } as Record<string, string | number>;

		const ph = new PostHogClient(instanceSettings, globalConfig);
		await ph.init();

		ph.groupIdentify({ instanceId, distinctId: `${instanceId}#user-1`, properties });

		expect(PostHog.prototype.capture).toHaveBeenCalledWith({
			distinctId: `${instanceId}#user-1`,
			event: '$groupidentify',
			properties: {
				$group_type: 'company',
				$group_key: instanceId,
				$group_set: properties,
			},
			groups: { company: instanceId },
		});
	});

	it('falls back to company_instanceId and disables person profile when no distinctId is provided', async () => {
		const properties = { name: 'test-instance' } as Record<string, string | number>;

		const ph = new PostHogClient(instanceSettings, globalConfig);
		await ph.init();

		ph.groupIdentify({ instanceId, properties });

		expect(PostHog.prototype.capture).toHaveBeenCalledWith({
			distinctId: `company_${instanceId}`,
			event: '$groupidentify',
			properties: {
				$group_type: 'company',
				$group_key: instanceId,
				$group_set: properties,
				$process_person_profile: false,
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
					instance_id: instanceId,
					version_cli: N8N_VERSION,
				},
				groups: { company: instanceId },
			});
		});

		it('returns cached flags on second call', async () => {
			const flags = { 'test-flag': true };
			(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags(flags));

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
			(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags(flags));

			const now = Date.now();
			const spy = vi.spyOn(Date, 'now').mockReturnValue(now);

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
			(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));

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
				globalConfig.evaluation.configEvalsEnabled = false;
				globalConfig.evaluation.agentEvalsEnabled = false;
				globalConfig.instanceAi.mcpConnectionsEnabled = false;
			});

			it('force-enables the eval-collections flag when N8N_EVAL_COLLECTIONS_ENABLED is set', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));
				globalConfig.evaluation.collectionsEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({ '084_eval_collections': true });
			});

			it('force-enables the config-evaluations variant when N8N_CONFIG_EVALS_ENABLED is set', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));
				globalConfig.evaluation.configEvalsEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({ '088_config_evaluations': 'variant' });
			});

			it('force-enables the MCP-connections variant when N8N_INSTANCE_AI_MCP_CONNECTIONS_ENABLED is set', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));
				globalConfig.instanceAi.mcpConnectionsEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({ '089_instance_ai_mcp_connections': 'variant' });
			});

			it('leaves flags untouched when no override is configured', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags({ 'some-other-flag': true }),
				);

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({ 'some-other-flag': true });
			});

			it('falls back to env overrides when PostHog throws', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockRejectedValue(new Error('posthog down'));
				globalConfig.evaluation.collectionsEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({ '084_eval_collections': true });
			});

			it('force-enables the agent-evals flag when N8N_AGENT_EVALS_ENABLED is set', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));
				globalConfig.evaluation.agentEvalsEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({ '101_agent_evals': true });
			});

			it('falls back to the agent-evals override when PostHog throws', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockRejectedValue(new Error('posthog down'));
				globalConfig.evaluation.agentEvalsEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({ '101_agent_evals': true });
			});
		});
	});

	describe('setupExpressSessionContext', () => {
		function createApp() {
			const handlers: RequestHandler[] = [];
			const app = {
				use: (handler: RequestHandler) => handlers.push(handler),
			} as unknown as Application;

			return { app, handlers };
		}

		function createRequest(sessionId?: string) {
			return { get: () => sessionId } as unknown as Request;
		}

		async function setupWithApp() {
			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			const { app, handlers } = createApp();
			ph.setupExpressSessionContext(app);

			return handlers;
		}

		beforeEach(() => {
			globalConfig.deployment.type = 'cloud';
			(PostHog.prototype.withContext as Mock).mockImplementation(
				(_context: unknown, fn: () => unknown) => fn(),
			);
		});

		it('attaches the browser session ID to the PostHog context', async () => {
			const [handler] = await setupWithApp();
			const next = vi.fn();

			void handler(createRequest('0192f1c2-session'), mock<Response>(), next);

			expect(PostHog.prototype.withContext).toHaveBeenCalledWith(
				{ sessionId: '0192f1c2-session' },
				next,
			);
			expect(next).toHaveBeenCalled();
		});

		it('passes the request through when the session header is absent', async () => {
			const [handler] = await setupWithApp();
			const next = vi.fn();

			void handler(createRequest(undefined), mock<Response>(), next);

			expect(PostHog.prototype.withContext).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalled();
		});

		it('strips non-printable characters from the session ID', async () => {
			const [handler] = await setupWithApp();
			const next = vi.fn();

			// A NUL and a newline, spelled out so they survive a trip through an editor.
			const hostile = `0192${String.fromCharCode(0)}-abc${String.fromCharCode(10)}`;

			void handler(createRequest(hostile), mock<Response>(), next);

			expect(PostHog.prototype.withContext).toHaveBeenCalledWith({ sessionId: '0192-abc' }, next);
		});

		it('caps the length of the session ID', async () => {
			const [handler] = await setupWithApp();
			const next = vi.fn();

			void handler(createRequest('a'.repeat(1500)), mock<Response>(), next);

			expect(PostHog.prototype.withContext).toHaveBeenCalledWith(
				{ sessionId: 'a'.repeat(1000) },
				next,
			);
		});

		it('does not register the middleware outside cloud deployments', async () => {
			globalConfig.deployment.type = 'default';

			expect(await setupWithApp()).toHaveLength(0);
		});

		it('does not register the middleware when diagnostics are disabled', async () => {
			globalConfig.diagnostics.enabled = false;

			expect(await setupWithApp()).toHaveLength(0);
		});
	});
});
