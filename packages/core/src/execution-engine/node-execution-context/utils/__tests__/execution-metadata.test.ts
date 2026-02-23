import { createRunExecutionData, type IRunExecutionData } from 'n8n-workflow';

import { InvalidExecutionMetadataError } from '@/errors/invalid-execution-metadata.error';

import {
	setWorkflowExecutionMetadata,
	setAllWorkflowExecutionMetadata,
	KV_LIMIT,
	getWorkflowExecutionMetadata,
	getAllWorkflowExecutionMetadata,
} from '../execution-metadata';

describe('Execution Metadata functions', () => {
	const createExecutionDataWithMetadata = (
		metadata: Record<string, string> = {},
	): {
		metadata: Record<string, string>;
		executionData: IRunExecutionData;
	} => {
		const executionData = createRunExecutionData({ resultData: { metadata } });

		return {
			metadata,
			executionData,
		};
	};

	test('setWorkflowExecutionMetadata will set a value', () => {
		const { metadata, executionData } = createExecutionDataWithMetadata();

		setWorkflowExecutionMetadata(executionData, 'test1', 'value1');

		expect(metadata).toEqual({
			test1: 'value1',
		});
	});

	test('setAllWorkflowExecutionMetadata will set multiple values', () => {
		const { metadata, executionData } = createExecutionDataWithMetadata();

		setAllWorkflowExecutionMetadata(executionData, {
			test1: 'value1',
			test2: 'value2',
		});

		expect(metadata).toEqual({
			test1: 'value1',
			test2: 'value2',
		});
	});

	test('setWorkflowExecutionMetadata should only convert numbers to strings', () => {
		const { metadata, executionData } = createExecutionDataWithMetadata();

		expect(() => setWorkflowExecutionMetadata(executionData, 'test1', 1234)).not.toThrow(
			InvalidExecutionMetadataError,
		);

		expect(metadata).toEqual({
			test1: '1234',
		});

		expect(() => setWorkflowExecutionMetadata(executionData, 'test2', {})).toThrow(
			InvalidExecutionMetadataError,
		);

		expect(metadata).not.toEqual({
			test1: '1234',
			test2: {},
		});
	});

	test('setAllWorkflowExecutionMetadata should not convert values to strings and should set other values correctly', () => {
		const { metadata, executionData } = createExecutionDataWithMetadata();

		expect(() =>
			setAllWorkflowExecutionMetadata(executionData, {
				test1: {} as unknown as string,
				test2: [] as unknown as string,
				test3: 'value3',
				test4: 'value4',
			}),
		).toThrow(InvalidExecutionMetadataError);

		expect(metadata).toEqual({
			test3: 'value3',
			test4: 'value4',
		});
	});

	test('setWorkflowExecutionMetadata should validate key characters', () => {
		const { metadata, executionData } = createExecutionDataWithMetadata();

		expect(() => setWorkflowExecutionMetadata(executionData, 'te$t1$', 1234)).toThrow(
			InvalidExecutionMetadataError,
		);

		expect(metadata).not.toEqual({
			test1: '1234',
		});
	});

	test('setWorkflowExecutionMetadata should limit the number of metadata entries', () => {
		const { metadata, executionData } = createExecutionDataWithMetadata();

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
		const { executionData } = createExecutionDataWithMetadata({ test1: 'value1' });

		expect(getWorkflowExecutionMetadata(executionData, 'test1')).toBe('value1');
	});

	test('getWorkflowExecutionMetadata should return undefined for an unset key', () => {
		const { executionData } = createExecutionDataWithMetadata({ test1: 'value1' });

		expect(getWorkflowExecutionMetadata(executionData, 'test2')).toBeUndefined();
	});

	test('getAllWorkflowExecutionMetadata should return all metadata', () => {
		const { metadata, executionData } = createExecutionDataWithMetadata({
			test1: 'value1',
			test2: 'value2',
		});

		expect(getAllWorkflowExecutionMetadata(executionData)).toEqual(metadata);
	});

	test('getAllWorkflowExecutionMetadata should not an object that modifies internal state', () => {
		const { metadata, executionData } = createExecutionDataWithMetadata({
			test1: 'value1',
			test2: 'value2',
		});

		getAllWorkflowExecutionMetadata(executionData).test1 = 'changed';

		expect(metadata.test1).not.toBe('changed');
		expect(metadata.test1).toBe('value1');
	});

	test('setWorkflowExecutionMetadata should truncate long keys', () => {
		const { metadata, executionData } = createExecutionDataWithMetadata();

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
		const { metadata, executionData } = createExecutionDataWithMetadata();

		const longValue = 'a'.repeat(513);

		setWorkflowExecutionMetadata(executionData, 'test1', longValue);

		expect(metadata).toEqual({
			test1: longValue.slice(0, 512),
		});
	});
});
