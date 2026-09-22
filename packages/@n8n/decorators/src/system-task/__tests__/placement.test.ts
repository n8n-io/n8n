import type { SystemTaskPlacement } from '../system-task-placement';

it('should not let a placement name an instance type a cluster-scoped task never reaches', () => {
	const placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: false,
		// @ts-expect-error A cluster-scoped task runs on a main, so it names no instance type.
		instanceTypes: ['worker'],
	};

	expect(placement.scope).toBe('cluster');
});

it('should make a cluster-scoped task state whether it is durable', () => {
	// @ts-expect-error The migration status is not optional.
	const placement: SystemTaskPlacement = { scope: 'cluster' };

	expect(placement.scope).toBe('cluster');
});

it('should not let an instance-scoped placement name no instance type', () => {
	// @ts-expect-error Nothing would run the task.
	const placement: SystemTaskPlacement = { scope: 'instance', instanceTypes: [] };

	expect(placement.scope).toBe('instance');
});

it('should not let an instance-scoped task be durable', () => {
	const placement: SystemTaskPlacement = {
		scope: 'instance',
		instanceTypes: ['worker'],
		// @ts-expect-error The durable scheduler runs one occurrence for the cluster, not one per instance.
		durable: true,
	};

	expect(placement.scope).toBe('instance');
});

it('should not let an instance-scoped task run on leader takeover', () => {
	const placement: SystemTaskPlacement = {
		scope: 'instance',
		instanceTypes: ['worker'],
		// @ts-expect-error Leadership means nothing to a task that runs in every instance.
		runOnTakeover: true,
	};

	expect(placement.scope).toBe('instance');
});
