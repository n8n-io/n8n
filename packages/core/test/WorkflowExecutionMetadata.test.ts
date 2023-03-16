import {
	getAllWorkflowExecutionMetadata,
	getWorkflowExecutionMetadata,
	KV_LIMIT,
	setAllWorkflowExecutionMetadata,
	setWorkflowExecutionMetadata,
} from '@/WorkflowExecutionMetadata';
import type { IRunExecutionData } from 'n8n-workflow';

describe('Execution Metadata functions', () => {
	test('setWorkflowExecutionMetadata will set a value', () => {
		const metadata = {};
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		setWorkflowExecutionMetadata(executionData, 'test1', 'value1');

		expect(metadata).toEqual({
			test1: 'value1',
		});
	});

	test('setAllWorkflowExecutionMetadata will set multiple values', () => {
		const metadata = {};
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		setAllWorkflowExecutionMetadata(executionData, {
			test1: 'value1',
			test2: 'value2',
		});

		expect(metadata).toEqual({
			test1: 'value1',
			test2: 'value2',
		});
	});

	test('setWorkflowExecutionMetadata should convert values to strings', () => {
		const metadata = {};
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		setWorkflowExecutionMetadata(executionData, 'test1', 1234);

		expect(metadata).toEqual({
			test1: '1234',
		});
	});

	test('setWorkflowExecutionMetadata should limit the number of metadata entries', () => {
		const metadata = {};
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		const expected: Record<string, string> = {};
		for (let i = 0; i < KV_LIMIT; i++) {
			expected[`test${i + 1}`] = `value${i + 1}`;
		}

		for (let i = 0; i < KV_LIMIT + 10; i++) {
			setWorkflowExecutionMetadata(executionData, `test${i + 1}`, `value${i + 1}`);
		}

		expect(metadata).toEqual(expected);
	});

	test('getWorkflowExecutionMetadata should return a single value for an existing key', () => {
		const metadata: Record<string, string> = { test1: 'value1' };
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		expect(getWorkflowExecutionMetadata(executionData, 'test1')).toBe('value1');
	});

	test('getWorkflowExecutionMetadata should return undefined for an unset key', () => {
		const metadata: Record<string, string> = { test1: 'value1' };
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		expect(getWorkflowExecutionMetadata(executionData, 'test2')).toBeUndefined();
	});

	test('getAllWorkflowExecutionMetadata should return all metadata', () => {
		const metadata: Record<string, string> = { test1: 'value1', test2: 'value2' };
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		expect(getAllWorkflowExecutionMetadata(executionData)).toEqual(metadata);
	});

	test('getAllWorkflowExecutionMetadata should not an object that modifies internal state', () => {
		const metadata: Record<string, string> = { test1: 'value1', test2: 'value2' };
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		getAllWorkflowExecutionMetadata(executionData).test1 = 'changed';

		expect(metadata.test1).not.toBe('changed');
		expect(metadata.test1).toBe('value1');
	});

	test('setWorkflowExecutionMetadata should truncate long keys', () => {
		const metadata = {};
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		setWorkflowExecutionMetadata(
			executionData,
			'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
			'value1',
		);

		expect(metadata).toEqual({
			aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: 'value1',
		});
	});

	test('setWorkflowExecutionMetadata should truncate long values', () => {
		const metadata = {};
		const executionData = {
			resultData: {
				metadata,
			},
		} as IRunExecutionData;

		setWorkflowExecutionMetadata(
			executionData,
			'test1',
			'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
		);

		expect(metadata).toEqual({
			test1:
				'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
		});
	});
});
