import { clusterTarget, instanceTarget, leaderTimerTarget } from '../system-task';

describe('clusterTarget', () => {
	it('should make a cluster target that runs on the scheduler', () => {
		const target = clusterTarget({
			scheduler: { retryOnFailure: true },
			leaderTimer: { runOnTakeover: true },
		});

		expect(target).toEqual({
			scope: 'cluster',
			scheduler: { retryOnFailure: true },
			leaderTimer: { runOnTakeover: true },
		});
		expect(target.scheduler.retryOnFailure).toBe(true);
	});

	it('should not take an unknown scheduler option', () => {
		// @ts-expect-error The option is `catchUp`.
		const target = clusterTarget({ scheduler: { retryOnFailure: true, catchup: false } });

		expect(target.scope).toBe('cluster');
	});

	it('should not take an instance type', () => {
		const target = clusterTarget({
			scheduler: { retryOnFailure: true },
			// @ts-expect-error A cluster task runs on a main, so it names no instance type.
			instanceTypes: ['worker'],
		});

		expect(target.scope).toBe('cluster');
	});
});

describe('leaderTimerTarget', () => {
	it('should make a cluster target that runs on the leader timer only', () => {
		// oxlint-disable-next-line typescript/no-deprecated -- the builder is under test
		const target = leaderTimerTarget({ runOnTakeover: true });

		expect(target).toEqual({ scope: 'cluster', leaderTimer: { runOnTakeover: true } });
	});
});

describe('instanceTarget', () => {
	it('should make an instance target for the instance types', () => {
		expect(instanceTarget(['main', 'worker'])).toEqual({
			scope: 'instance',
			instanceTypes: ['main', 'worker'],
		});
	});

	it('should not take an empty list of instance types', () => {
		// @ts-expect-error Nothing would run the task.
		const target = instanceTarget([]);

		expect(target.scope).toBe('instance');
	});
});
