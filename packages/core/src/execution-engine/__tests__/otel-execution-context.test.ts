import {
	consumeOtelExecutionWrapper,
	registerOtelExecutionWrapper,
} from '../otel-execution-context';

describe('otel-execution-context', () => {
	it('returns the registered wrapper and removes it after consuming', () => {
		const wrapper = async (fn: () => Promise<void>) => await fn();
		registerOtelExecutionWrapper('exec-1', wrapper);

		expect(consumeOtelExecutionWrapper('exec-1')).toBe(wrapper);
		// Consumed once — a second read returns undefined.
		expect(consumeOtelExecutionWrapper('exec-1')).toBeUndefined();
	});

	it('returns undefined for an unknown execution id', () => {
		expect(consumeOtelExecutionWrapper('never-registered')).toBeUndefined();
	});

	it('keeps wrappers isolated per execution id', () => {
		const a = async (fn: () => Promise<void>) => await fn();
		const b = async (fn: () => Promise<void>) => await fn();
		registerOtelExecutionWrapper('exec-a', a);
		registerOtelExecutionWrapper('exec-b', b);

		expect(consumeOtelExecutionWrapper('exec-b')).toBe(b);
		expect(consumeOtelExecutionWrapper('exec-a')).toBe(a);
	});
});
