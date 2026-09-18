import {
	type SystemTask,
	type SystemTaskPlacement,
	type SystemTaskSchedule,
	resolveSystemTaskPlacement,
} from '../system-task';

const schedule: SystemTaskSchedule = { kind: 'interval', intervalSeconds: 60 };

const taskWith = (overrides: Partial<SystemTask> = {}): SystemTask => ({
	name: 'test-task',
	schedule,
	effects: 'idempotent',
	durable: false,
	run: async () => {},
	...overrides,
});

const onEveryWorker: SystemTaskPlacement = { scope: 'instance', instanceTypes: ['worker'] };

it('should default a task to one run for the whole cluster', () => {
	expect(resolveSystemTaskPlacement(taskWith())).toEqual({ scope: 'cluster' });
});

it('should keep a declared placement', () => {
	expect(resolveSystemTaskPlacement(taskWith({ placement: onEveryWorker }))).toEqual(onEveryWorker);
});

it('should reject an instance-scoped task that is durable', () => {
	expect(() =>
		resolveSystemTaskPlacement(taskWith({ placement: onEveryWorker, durable: true })),
	).toThrow('An instance-scoped system task cannot be durable');
});

it('should reject an instance-scoped task that asks to run on takeover', () => {
	expect(() =>
		resolveSystemTaskPlacement(taskWith({ placement: onEveryWorker, runOnTakeover: true })),
	).toThrow('An instance-scoped system task cannot run on leader takeover');
});

it('should accept an instance-scoped task that opts out of running on takeover', () => {
	expect(
		resolveSystemTaskPlacement(taskWith({ placement: onEveryWorker, runOnTakeover: false })).scope,
	).toBe('instance');
});

it('should not let a placement name an instance type a cluster-scoped task never reaches', () => {
	// @ts-expect-error A cluster-scoped task runs on a main, so it names no instance type.
	const placement: SystemTaskPlacement = { scope: 'cluster', instanceTypes: ['worker'] };

	expect(placement.scope).toBe('cluster');
});

it('should not let an instance-scoped placement name no instance type', () => {
	// @ts-expect-error Nothing would run the task.
	const placement: SystemTaskPlacement = { scope: 'instance', instanceTypes: [] };

	expect(placement.scope).toBe('instance');
});
