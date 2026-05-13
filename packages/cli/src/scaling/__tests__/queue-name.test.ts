import { resolveQueueName } from '../queue-name';

describe('resolveQueueName', () => {
	test('returns "jobs" on main regardless of pool', () => {
		expect(resolveQueueName('main', '')).toBe('jobs');
		expect(resolveQueueName('main', 'gpu')).toBe('jobs');
	});

	test('returns "jobs" on webhook regardless of pool', () => {
		expect(resolveQueueName('webhook', '')).toBe('jobs');
		expect(resolveQueueName('webhook', 'gpu')).toBe('jobs');
	});

	test('returns "jobs" on worker when pool is empty', () => {
		expect(resolveQueueName('worker', '')).toBe('jobs');
	});

	test('returns "jobs-<pool>" on worker when pool is set', () => {
		expect(resolveQueueName('worker', 'gpu')).toBe('jobs-gpu');
		expect(resolveQueueName('worker', 'a1-b2')).toBe('jobs-a1-b2');
	});
});
