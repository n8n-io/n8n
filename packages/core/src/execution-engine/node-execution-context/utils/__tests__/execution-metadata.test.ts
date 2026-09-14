import type { IRunExecutionData } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';

import {
	KEY_MAX_LENGTH,
	VALUE_MAX_LENGTH,
	setWorkflowExecutionMetadata,
} from '../execution-metadata';

/**
 * The value log fired at 255 characters while the value was cut at 512, so
 * everything between the two was reported as truncated when it had been stored
 * whole — and reported as an `error`, though nothing failed (#38438).
 */
describe('setWorkflowExecutionMetadata truncation reporting', () => {
	const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
	let executionData: IRunExecutionData;

	beforeEach(() => {
		vi.clearAllMocks();
		LoggerProxy.init(logger as never);
		executionData = { resultData: { runData: {} } } as IRunExecutionData;
	});

	const store = (value: string, key = 'k') => {
		setWorkflowExecutionMetadata(executionData, key, value);
		return executionData.resultData.metadata?.[key.slice(0, KEY_MAX_LENGTH)];
	};

	test('a value between the old threshold and the real limit is stored whole and not reported', () => {
		const value = 'x'.repeat(300);

		expect(store(value)).toBe(value);
		expect(logger.warn).not.toHaveBeenCalled();
		expect(logger.error).not.toHaveBeenCalled();
	});

	test('a value at the limit is stored whole and not reported', () => {
		const value = 'x'.repeat(VALUE_MAX_LENGTH);

		expect(store(value)).toBe(value);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	test('a value over the limit is truncated and reported once, as a warning', () => {
		const value = 'x'.repeat(VALUE_MAX_LENGTH + 1);

		expect(store(value)).toHaveLength(VALUE_MAX_LENGTH);
		expect(logger.warn).toHaveBeenCalledTimes(1);
		// LoggerProxy always forwards a second `meta` argument, so assert the message.
		expect(logger.warn.mock.calls[0][0]).toBe(
			`Custom data value over ${VALUE_MAX_LENGTH} characters long. Truncating to ${VALUE_MAX_LENGTH} characters.`,
		);
		// Truncation is not a failure: the execution carries on and the shortened
		// value is stored.
		expect(logger.error).not.toHaveBeenCalled();
	});

	test('an over-long key is truncated and reported as a warning too', () => {
		const key = 'k'.repeat(KEY_MAX_LENGTH + 1);

		setWorkflowExecutionMetadata(executionData, key, 'v');

		expect(executionData.resultData.metadata).toHaveProperty(key.slice(0, KEY_MAX_LENGTH), 'v');
		expect(logger.warn.mock.calls[0][0]).toBe(
			`Custom data key over ${KEY_MAX_LENGTH} characters long. Truncating to ${KEY_MAX_LENGTH} characters.`,
		);
		expect(logger.error).not.toHaveBeenCalled();
	});

	test('a key at the limit is not reported', () => {
		setWorkflowExecutionMetadata(executionData, 'k'.repeat(KEY_MAX_LENGTH), 'v');

		expect(logger.warn).not.toHaveBeenCalled();
	});
});
