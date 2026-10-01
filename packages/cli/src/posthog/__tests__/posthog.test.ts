import { CREDENTIAL_DESCRIPTIONS_FLAG, INSTANCE_ACTIVITY_CONTEXT_FLAG } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { Application, Request, RequestHandler, Response } from 'express';
import { InstanceSettings } from 'n8n-core';
import type { FeatureFlagPayloads, FeatureFlags } from 'n8n-workflow';
import { PostHog } from 'posthog-node';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import { PostHogClient } from '@/posthog';

vi.mock('posthog-node');

function mockEvaluatedFlags(flags: FeatureFlags, payloads: FeatureFlagPayloads = {}) {
	return {
		keys: Object.keys(flags),
		getFlag: (key: string) => flags[key],
		getFlagPayload: (key: string) => payloads[key],
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

	describe('getFeatureFlagForInstance', () => {
		afterEach(() => {
			globalConfig.featureFlags.override = {};
		});

		it('evaluates the flag with the instance group and no user properties', async () => {
			(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
				mockEvaluatedFlags({ [INSTANCE_ACTIVITY_CONTEXT_FLAG]: true }),
			);
			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await expect(ph.getFeatureFlagForInstance(INSTANCE_ACTIVITY_CONTEXT_FLAG)).resolves.toBe(
				true,
			);
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledWith(`company_${instanceId}`, {
				flagKeys: [INSTANCE_ACTIVITY_CONTEXT_FLAG],
				groups: { company: instanceId },
			});
		});

		it('fails closed when the instance flag cannot be read', async () => {
			(PostHog.prototype.evaluateFlags as Mock).mockRejectedValue(new Error('PostHog failed'));
			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await expect(
				ph.getFeatureFlagForInstance(INSTANCE_ACTIVITY_CONTEXT_FLAG),
			).resolves.toBeUndefined();
		});

		it.each([true, false])(
			'lets a feature flag override set the instance flag to %s',
			async (enabled) => {
				globalConfig.featureFlags.override = { [INSTANCE_ACTIVITY_CONTEXT_FLAG]: enabled };
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags({ [INSTANCE_ACTIVITY_CONTEXT_FLAG]: !enabled }),
				);
				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				await expect(ph.getFeatureFlagForInstance(INSTANCE_ACTIVITY_CONTEXT_FLAG)).resolves.toBe(
					enabled,
				);
			},
		);

		it('applies local overrides when diagnostics are disabled', async () => {
			globalConfig.diagnostics.enabled = false;
			globalConfig.featureFlags.override = { [INSTANCE_ACTIVITY_CONTEXT_FLAG]: true };
			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await expect(ph.getFeatureFlagForInstance(INSTANCE_ACTIVITY_CONTEXT_FLAG)).resolves.toBe(
				true,
			);
			globalConfig.featureFlags.override = { [INSTANCE_ACTIVITY_CONTEXT_FLAG]: false };
			await expect(ph.getFeatureFlagForInstance(INSTANCE_ACTIVITY_CONTEXT_FLAG)).resolves.toBe(
				false,
			);
			expect(PostHog.prototype.evaluateFlags).not.toHaveBeenCalled();
		});
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

		it('uses one instance result for all users and backend consumers', async () => {
			(PostHog.prototype.evaluateFlags as Mock).mockImplementation(async (distinctId: string) =>
				mockEvaluatedFlags({
					[CREDENTIAL_DESCRIPTIONS_FLAG]: distinctId === `company_${instanceId}`,
				}),
			);
			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			for (const id of ['user-1', 'user-2']) {
				const flags = await ph.getFeatureFlags({ id, createdAt });
				expect(flags[CREDENTIAL_DESCRIPTIONS_FLAG]).toBe(true);
			}
			expect(await ph.getFeatureFlagForInstance(CREDENTIAL_DESCRIPTIONS_FLAG)).toBe(true);
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(3);
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledWith(`company_${instanceId}`, {
				groups: { company: instanceId },
				flagKeys: [CREDENTIAL_DESCRIPTIONS_FLAG],
			});
		});

		it.each([false, undefined, 'true', 'variant'])(
			'keeps descriptions disabled when the instance result is %s',
			async (instanceResult) => {
				(PostHog.prototype.evaluateFlags as Mock).mockImplementation(async (distinctId: string) =>
					mockEvaluatedFlags(
						distinctId === `company_${instanceId}`
							? instanceResult === undefined
								? {}
								: { [CREDENTIAL_DESCRIPTIONS_FLAG]: instanceResult }
							: { [CREDENTIAL_DESCRIPTIONS_FLAG]: true },
					),
				);
				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });
				expect(flags[CREDENTIAL_DESCRIPTIONS_FLAG]).toBe(false);
			},
		);

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

		it('returns and caches remote config payloads from the same flag evaluation', async () => {
			const flags = { 'config-form-url': true };
			const payloads = { 'config-form-url': 'https://example.com/form' };
			(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
				mockEvaluatedFlags(flags, payloads),
			);

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			const expected = {
				featureFlags: { ...flags, [CREDENTIAL_DESCRIPTIONS_FLAG]: false },
				featureFlagPayloads: payloads,
			};

			await expect(ph.getFeatureFlagsAndPayloads({ id: userId, createdAt })).resolves.toEqual(
				expected,
			);
			await expect(ph.getFeatureFlagsAndPayloads({ id: userId, createdAt })).resolves.toEqual(
				expected,
			);
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(2);
		});

		it('returns cached flags on second call', async () => {
			const flags = { 'test-flag': true };
			(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags(flags));

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			const first = await ph.getFeatureFlags({ id: userId, createdAt });
			const second = await ph.getFeatureFlags({ id: userId, createdAt });

			expect(first).toEqual({ ...flags, [CREDENTIAL_DESCRIPTIONS_FLAG]: false });
			expect(second).toEqual({ ...flags, [CREDENTIAL_DESCRIPTIONS_FLAG]: false });
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(2);
		});

		it('refetches after cache expires', async () => {
			const flags = { 'test-flag': true };
			(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags(flags));

			const now = Date.now();
			const spy = vi.spyOn(Date, 'now').mockReturnValue(now);

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await ph.getFeatureFlags({ id: userId, createdAt });
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(2);

			spy.mockReturnValue(now + 10 * 60 * 1000 + 1);

			await ph.getFeatureFlags({ id: userId, createdAt });
			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(4);

			spy.mockRestore();
		});

		it('does not cache empty results', async () => {
			(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));

			const ph = new PostHogClient(instanceSettings, globalConfig);
			await ph.init();

			await ph.getFeatureFlags({ id: userId, createdAt });
			await ph.getFeatureFlags({ id: userId, createdAt });

			expect(PostHog.prototype.evaluateFlags).toHaveBeenCalledTimes(4);
		});

		describe('env-var overrides', () => {
			afterEach(() => {
				// Mutated per test; reset so test ordering doesn't leak override
				// state into unrelated cases.
				globalConfig.evaluation.collectionsEnabled = false;
				globalConfig.evaluation.configEvalsEnabled = false;
				globalConfig.evaluation.agentEvalsEnabled = false;
				globalConfig.instanceAi.canvasNodeContextEnabled = false;
				globalConfig.instanceAi.folderExplorationEnabled = false;
				globalConfig.workflows.groupsWithTriggersEnabled = false;
				globalConfig.workflows.groupsWithManyBoundariesEnabled = false;
				globalConfig.featureFlags.override = {};
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

			it('leaves the instance activity flag unset when PostHog has no answer', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags['114_instance_activity_context']).toBeUndefined();
			});

			it('force-enables the folder-exploration flag when N8N_INSTANCE_AI_FOLDER_EXPLORATION_ENABLED is set', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));
				globalConfig.instanceAi.folderExplorationEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({ '110_instance_ai_folder_exploration': 'test' });
			});

			it('force-enables the groups-with-triggers flag on its own env var', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags({
						'117_flexible_groups_triggers': false,
						'122_flexible_groups_multiple_boundaries': false,
					}),
				);

				globalConfig.workflows.groupsWithTriggersEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({
					'117_flexible_groups_triggers': true,
					'122_flexible_groups_multiple_boundaries': false,
				});
			});

			it('force-enables the groups-with-many-boundaries flag on its own env var', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags({
						'117_flexible_groups_triggers': false,
						'122_flexible_groups_multiple_boundaries': false,
					}),
				);

				globalConfig.workflows.groupsWithManyBoundariesEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({
					'117_flexible_groups_triggers': false,
					'122_flexible_groups_multiple_boundaries': true,
				});
			});

			it('applies the generic override map on top of resolved flags', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags({ 'some-other-flag': true }),
				);
				globalConfig.featureFlags.override = {
					'multivariate-flag': 'variant',
					'boolean-flag': true,
				};

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({
					[CREDENTIAL_DESCRIPTIONS_FLAG]: false,
					'some-other-flag': true,
					'multivariate-flag': 'variant',
					'boolean-flag': true,
				});
			});

			it('overrides a flag PostHog resolved to a different value', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags({ 'contested-flag': 'control' }),
				);
				globalConfig.featureFlags.override = { 'contested-flag': 'variant' };

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({
					[CREDENTIAL_DESCRIPTIONS_FLAG]: false,
					'contested-flag': 'variant',
				});
			});

			it('applies flag and payload overrides together', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags(
						{
							'value-only-flag': 'variant',
							'payload-flag': 'control',
							'untouched-flag': true,
						},
						{
							'value-only-flag': { source: 'posthog' },
							'payload-flag': { source: 'posthog' },
							'untouched-flag': { source: 'posthog' },
						},
					),
				);
				globalConfig.featureFlags.override = {
					'value-only-flag': 'variant',
					'payload-flag': {
						value: 'variant',
						payload: { source: 'environment' },
					},
				};

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const data = await ph.getFeatureFlagsAndPayloads({ id: userId, createdAt });

				expect(data).toEqual({
					featureFlags: {
						[CREDENTIAL_DESCRIPTIONS_FLAG]: false,
						'value-only-flag': 'variant',
						'payload-flag': 'variant',
						'untouched-flag': true,
					},
					featureFlagPayloads: {
						'payload-flag': { source: 'environment' },
						'untouched-flag': { source: 'posthog' },
					},
				});
			});

			// Unlike the per-feature envs (force-enable only), the generic map is
			// also a kill switch — it must be able to turn an enabled flag off.
			it('force-disables a flag PostHog resolved to true', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags({ 'live-flag': true }),
				);
				globalConfig.featureFlags.override = { 'live-flag': false };

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({ [CREDENTIAL_DESCRIPTIONS_FLAG]: false, 'live-flag': false });
			});

			// A dedicated per-feature env var must have the final say, so the
			// generic map cannot undo a feature an operator enabled explicitly.
			it('does not override a per-feature env override for the same flag', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));
				globalConfig.evaluation.configEvalsEnabled = true;
				globalConfig.featureFlags.override = { '088_config_evaluations': false };

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({ '088_config_evaluations': 'variant' });
			});

			it('leaves flags untouched when no override is configured', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags({ 'some-other-flag': true }),
				);

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({ [CREDENTIAL_DESCRIPTIONS_FLAG]: false, 'some-other-flag': true });
			});

			it('falls back to env overrides when PostHog throws', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockRejectedValue(new Error('posthog down'));
				globalConfig.evaluation.collectionsEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({
					[CREDENTIAL_DESCRIPTIONS_FLAG]: false,
					'084_eval_collections': true,
				});
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

				expect(flags).toEqual({ [CREDENTIAL_DESCRIPTIONS_FLAG]: false, '101_agent_evals': true });
			});

			it('force-enables the canvas-node-context flag when N8N_INSTANCE_AI_NODE_CONTEXT_ENABLED is set', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));

				globalConfig.instanceAi.canvasNodeContextEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toMatchObject({ '104_canvas_aia_node_context': true });
			});

			it('leaves the canvas-node-context flag untouched when the override is off', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(
					mockEvaluatedFlags({ '104_canvas_aia_node_context': true }),
				);

				globalConfig.instanceAi.canvasNodeContextEnabled = false;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({
					[CREDENTIAL_DESCRIPTIONS_FLAG]: false,
					'104_canvas_aia_node_context': true,
				});
			});

			it('applies all env overrides independently when several are set at once', async () => {
				(PostHog.prototype.evaluateFlags as Mock).mockResolvedValue(mockEvaluatedFlags({}));

				globalConfig.evaluation.collectionsEnabled = true;
				globalConfig.evaluation.configEvalsEnabled = true;
				globalConfig.evaluation.agentEvalsEnabled = true;
				globalConfig.instanceAi.canvasNodeContextEnabled = true;

				const ph = new PostHogClient(instanceSettings, globalConfig);
				await ph.init();

				const flags = await ph.getFeatureFlags({ id: userId, createdAt });

				expect(flags).toEqual({
					[CREDENTIAL_DESCRIPTIONS_FLAG]: false,
					'084_eval_collections': true,
					'088_config_evaluations': 'variant',
					'101_agent_evals': true,
					'104_canvas_aia_node_context': true,
				});
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
