import {
	type SystemTask,
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

it('should default a task to one run for the whole cluster, on a main', () => {
	expect(resolveSystemTaskPlacement(taskWith())).toEqual({
		scope: 'cluster',
		instanceTypes: ['main'],
	});
});

it('should keep a declared placement', () => {
	const placement = resolveSystemTaskPlacement(
		taskWith({ scope: 'process', instanceTypes: ['main', 'worker'] }),
	);

	expect(placement).toEqual({ scope: 'process', instanceTypes: ['main', 'worker'] });
});

it('should reject a process-scoped task that is durable', () => {
	expect(() => resolveSystemTaskPlacement(taskWith({ scope: 'process', durable: true }))).toThrow(
		'A process-scoped system task cannot be durable',
	);
});

it('should reject a process-scoped task that asks to run on takeover', () => {
	expect(() =>
		resolveSystemTaskPlacement(taskWith({ scope: 'process', runOnTakeover: true })),
	).toThrow('A process-scoped system task cannot run on leader takeover');
});

it('should accept a process-scoped task that opts out of running on takeover', () => {
	expect(
		resolveSystemTaskPlacement(taskWith({ scope: 'process', runOnTakeover: false })).scope,
	).toBe('process');
});

it('should reject a task that declares no instance type', () => {
	expect(() => resolveSystemTaskPlacement(taskWith({ instanceTypes: [] }))).toThrow(
		'declares no instance type',
	);
});
