import {
	createInstanceAiLivenessPolicyConfig,
	INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG,
	InstanceAiLivenessPolicy,
} from '../liveness-policy';

const minute = 60_000;
const day = 24 * 60 * minute;

function createPolicy() {
	return new InstanceAiLivenessPolicy(INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG);
}

describe('InstanceAiLivenessPolicy', () => {
	it('keeps default liveness limits centralized and allows the existing confirmation override', () => {
		expect(INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG).toEqual({
			confirmationTimeoutMs: day,
			backgroundTaskIdleTimeoutMs: 10 * minute,
			backgroundTaskMaxLifetimeMs: 30 * minute,
			activeRunIdleTimeoutMs: 0,
			activeRunMaxLifetimeMs: day,
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
			lastActivityAt: day + minute,
			now: day + minute,
		});

		expect(decision).toMatchObject({
			action: 'timeout',
			reason: 'max_lifetime',
			surface: 'active-run',
			timeoutMs: day,
		});
	});

	it('does not idle-timeout an active run that is waiting on another surface', () => {
		const decision = createPolicy().evaluate({
			surface: 'active-run',
			startedAt: 0,
			lastActivityAt: 0,
			now: 6 * 60 * minute,
		});

		expect(decision).toEqual({ action: 'keep-alive' });
	});

	it('uses the one-day confirmation timeout for suspended runs and pending confirmations by default', () => {
		const policy = createPolicy();
		const shorterWorkTimeout = 30 * minute;

		expect(
			policy.evaluate({
				surface: 'suspended-run',
				startedAt: 0,
				lastActivityAt: 0,
				now: shorterWorkTimeout,
			}),
		).toEqual({ action: 'keep-alive' });

		expect(
			policy.evaluate({
				surface: 'pending-confirmation',
				startedAt: 0,
				lastActivityAt: 0,
				now: shorterWorkTimeout,
			}),
		).toEqual({ action: 'keep-alive' });

		expect(
			policy.evaluate({
				surface: 'suspended-run',
				startedAt: 0,
				lastActivityAt: 0,
				now: day,
			}),
		).toMatchObject({ action: 'timeout', reason: 'idle_timeout', timeoutMs: day });

		expect(
			policy.evaluate({
				surface: 'pending-confirmation',
				startedAt: 0,
				lastActivityAt: 0,
				now: day,
			}),
		).toMatchObject({ action: 'timeout', reason: 'idle_timeout', timeoutMs: day });
	});

	it('uses a configured confirmation timeout for suspended runs and pending confirmations', () => {
		const policy = new InstanceAiLivenessPolicy(
			createInstanceAiLivenessPolicyConfig({ confirmationTimeoutMs: 10 * minute }),
		);

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
