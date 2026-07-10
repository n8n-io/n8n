import { TaskHandlerRegistry, type TaskHandler } from '../task-handler';

const fakeHandler = (): TaskHandler => ({ execute: async () => {} });

describe('TaskHandlerRegistry', () => {
	it('resolves a registered handler by task type', () => {
		const registry = new TaskHandlerRegistry();
		const handler = fakeHandler();
		registry.register('workflow:schedule-trigger', handler);

		expect(registry.resolve('workflow:schedule-trigger')).toBe(handler);
	});

	it('returns undefined for an unregistered task type', () => {
		const registry = new TaskHandlerRegistry();
		expect(registry.resolve('unknown')).toBeUndefined();
	});

	it('throws when a task type is registered twice', () => {
		const registry = new TaskHandlerRegistry();
		registry.register('a', fakeHandler());

		expect(() => registry.register('a', fakeHandler())).toThrow(
			"A handler for task type 'a' is already registered",
		);
	});

	it('lists the registered task types', () => {
		const registry = new TaskHandlerRegistry();
		registry.register('a', fakeHandler());
		registry.register('b', fakeHandler());

		// Membership is the contract (it scopes the claim); order is not guaranteed.
		expect(registry.registeredTypes()).toHaveLength(2);
		expect(new Set(registry.registeredTypes())).toEqual(new Set(['a', 'b']));
	});
});
