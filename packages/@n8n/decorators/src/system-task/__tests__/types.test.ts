import type { SchedulerOptions, SystemTaskTarget } from '../types';

it('should let an instance task name the instance types that run it', () => {
	const target: SystemTaskTarget = {
		scope: 'instance',
		instanceTypes: ['main', 'worker'],
		retryDelaySeconds: 30,
	};

	expect(target.scope).toBe('instance');
});

it('should let a cluster task run on the scheduler and fall back to the leader timer', () => {
	const target: SystemTaskTarget = {
		scope: 'cluster',
		scheduler: { maxAttempts: 1, missedAfterSeconds: 300, catchUp: false, timeoutSeconds: 60 },
		leaderTimer: { runOnTakeover: true, retryDelaySeconds: 30 },
	};

	expect(target.scope).toBe('cluster');
});

it('should let a cluster task run on the leader timer only', () => {
	const target: SystemTaskTarget = { scope: 'cluster', leaderTimer: {} };

	expect(target.scope).toBe('cluster');
});

it('should not let a cluster task name no runner', () => {
	// @ts-expect-error Nothing would run the task.
	const target: SystemTaskTarget = { scope: 'cluster' };

	expect(target.scope).toBe('cluster');
});

it('should not let a cluster task name an instance type', () => {
	const target: SystemTaskTarget = {
		scope: 'cluster',
		scheduler: { maxAttempts: 3 },
		// @ts-expect-error A cluster task runs on a main, so it names no instance type.
		instanceTypes: ['worker'],
	};

	expect(target.scope).toBe('cluster');
});

it('should not let a cluster task set a retry delay outside the leader timer', () => {
	// @ts-expect-error The scheduler retries by attempts, the leader timer by delay.
	const target: SystemTaskTarget = {
		scope: 'cluster',
		scheduler: { maxAttempts: 3 },
		retryDelaySeconds: 30,
	};

	expect(target.scope).toBe('cluster');
});

it('should make a scheduler task state its attempts', () => {
	// @ts-expect-error There is no safe default: a repeat is not safe for every task.
	const scheduler: SchedulerOptions = { missedAfterSeconds: 60 };

	expect(scheduler.missedAfterSeconds).toBe(60);
});

it('should not take null as a concurrency limit', () => {
	// @ts-expect-error `'unlimited'` says it in words.
	const scheduler: SchedulerOptions = { maxAttempts: 3, concurrencyLimit: null };

	expect(scheduler.maxAttempts).toBe(3);
});

it('should not let an instance task name no instance type', () => {
	// @ts-expect-error Nothing would run the task.
	const target: SystemTaskTarget = { scope: 'instance', instanceTypes: [] };

	expect(target.scope).toBe('instance');
});

it('should not let an instance task run on the scheduler', () => {
	// @ts-expect-error The scheduler runs one occurrence for the cluster, not one per instance.
	const target: SystemTaskTarget = {
		scope: 'instance',
		instanceTypes: ['worker'],
		scheduler: { maxAttempts: 3 },
	};

	expect(target.scope).toBe('instance');
});

it('should not let an instance task run on leader takeover', () => {
	// @ts-expect-error Leadership means nothing to a task that runs in every instance.
	const target: SystemTaskTarget = {
		scope: 'instance',
		instanceTypes: ['worker'],
		leaderTimer: { runOnTakeover: true },
	};

	expect(target.scope).toBe('instance');
});
