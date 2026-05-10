import {
	createInstanceAiLivenessPolicyConfig,
	INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG,
	InstanceAiLivenessPolicy,
} from '../liveness-policy';

const minute = 60_000;

function createPolicy() {
	return new InstanceAiLivenessPolicy(INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG);
}

describe('InstanceAiLivenessPolicy', () => {
	it('keeps default liveness limits centralized and allows the existing confirmation override', () => {
		expect(INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG).toEqual({
			confirmationTimeoutMs: 10 * minute,
			backgroundTaskIdleTimeoutMs: 10 * minute,
			backgroundTaskMaxLifetimeMs: 30 * minute,
			activeRunIdleTimeoutMs: 10 * minute,
			activeRunMaxLifetimeMs: 30 * minute,
		});

		expect(createInstanceAiLivenessPolicyConfig({ confirmationTimeoutMs: 42_000 })).toEqual({
			...INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG,
			confirmationTimeoutMs: 42_000,
		});
	});

	it('keeps active work alive while it is still reporting activity', () => {
		const decision = createPolicy().evaluate({
			surface: 'background-task',
			startedAt: 0,
			lastActivityAt: 9 * minute,
			now: 10 * minute,
		});

		expect(decision).toEqual({ action: 'keep-alive' });
	});

	it('times out background work after the idle limit', () => {
		const decision = createPolicy().evaluate({
			surface: 'background-task',
			startedAt: 0,
			lastActivityAt: 0,
			now: 10 * minute,
		});

		expect(decision).toMatchObject({
			action: 'timeout',
			reason: 'idle_timeout',
			surface: 'background-task',
			timeoutMs: 10 * minute,
		});
	});

	it('times out active work at the max lifetime even with recent activity', () => {
		const decision = createPolicy().evaluate({
			surface: 'active-run',
			startedAt: 0,
			lastActivityAt: 31 * minute,
			now: 31 * minute,
		});

		expect(decision).toMatchObject({
			action: 'timeout',
			reason: 'max_lifetime',
			surface: 'active-run',
			timeoutMs: 30 * minute,
		});
	});

	it('uses the confirmation timeout for suspended runs and pending confirmations', () => {
		const policy = createPolicy();

		expect(
			policy.evaluate({
				surface: 'suspended-run',
				startedAt: 0,
				lastActivityAt: 0,
				now: 10 * minute,
			}),
		).toMatchObject({ action: 'timeout', reason: 'idle_timeout' });

		expect(
			policy.evaluate({
				surface: 'pending-confirmation',
				startedAt: 0,
				lastActivityAt: 0,
				now: 10 * minute,
			}),
		).toMatchObject({ action: 'timeout', reason: 'idle_timeout' });
	});

	it('keeps a surface alive when its timeout is disabled', () => {
		const policy = new InstanceAiLivenessPolicy({
			confirmationTimeoutMs: 0,
			backgroundTaskIdleTimeoutMs: 0,
			backgroundTaskMaxLifetimeMs: 0,
			activeRunIdleTimeoutMs: 0,
			activeRunMaxLifetimeMs: 0,
		});

		expect(
			policy.evaluate({
				surface: 'pending-confirmation',
				startedAt: 0,
				lastActivityAt: 0,
				now: 60 * minute,
			}),
		).toEqual({ action: 'keep-alive' });
	});
});
