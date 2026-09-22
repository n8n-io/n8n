import { UnexpectedError } from 'n8n-workflow';

import type { SystemTaskClass } from '../system-task';
import { SystemTaskMetadata } from '../system-task-metadata';

class FirstTask {}
class SecondTask {}

const firstTaskClass = FirstTask as unknown as SystemTaskClass;
const secondTaskClass = SecondTask as unknown as SystemTaskClass;

describe('SystemTaskMetadata', () => {
	let metadata: SystemTaskMetadata;

	beforeEach(() => {
		metadata = new SystemTaskMetadata();
	});

	it('should expose the task classes registered so far', () => {
		expect(metadata.getClasses()).toEqual([]);

		metadata.register(firstTaskClass);
		metadata.register(secondTaskClass);

		expect(metadata.getClasses()).toEqual([firstTaskClass, secondTaskClass]);
		expect(metadata.getClasses()).not.toBe(metadata.getClasses());
	});

	it('should replay task classes registered before subscribe()', () => {
		metadata.register(firstTaskClass);

		const listener = vi.fn();
		metadata.subscribe(listener);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(firstTaskClass);
	});

	it('should notify on task classes registered after subscribe()', () => {
		const listener = vi.fn();
		metadata.subscribe(listener);

		metadata.register(secondTaskClass);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(secondTaskClass);
	});

	it('should replay existing task classes then notify on subsequent ones', () => {
		metadata.register(firstTaskClass);

		const listener = vi.fn();
		metadata.subscribe(listener);
		metadata.register(secondTaskClass);

		expect(listener).toHaveBeenCalledTimes(2);
		expect(listener).toHaveBeenNthCalledWith(1, firstTaskClass);
		expect(listener).toHaveBeenNthCalledWith(2, secondTaskClass);
	});

	it('should deliver a task class registered by the listener during replay only once', () => {
		metadata.register(firstTaskClass);

		const received: SystemTaskClass[] = [];
		metadata.subscribe((taskClass) => {
			received.push(taskClass);
			if (taskClass === firstTaskClass) {
				metadata.register(secondTaskClass);
			}
		});

		expect(received).toEqual([firstTaskClass, secondTaskClass]);
	});

	it('should leave the subscription open when the listener throws during replay', () => {
		metadata.register(firstTaskClass);

		expect(() =>
			metadata.subscribe(() => {
				throw new Error('listener failed');
			}),
		).toThrowError('FirstTask');

		const listener = vi.fn();

		expect(() => metadata.subscribe(listener)).not.toThrow();
		expect(listener).toHaveBeenCalledWith(firstTaskClass);
	});

	it('should name the task class when a listener throws', () => {
		const cause = new Error('cannot resolve dependency');
		metadata.subscribe(() => {
			throw cause;
		});

		let caught: unknown;
		try {
			metadata.register(secondTaskClass);
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(UnexpectedError);
		expect((caught as UnexpectedError).message).toContain('SecondTask');
		expect((caught as UnexpectedError).cause).toBe(cause);
	});

	it('should reject a second subscriber', () => {
		metadata.subscribe(vi.fn());

		expect(() => metadata.subscribe(vi.fn())).toThrowError(
			'A listener is already subscribed to system task registrations',
		);
	});
});
