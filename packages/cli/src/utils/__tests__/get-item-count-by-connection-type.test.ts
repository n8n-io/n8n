import type { ITaskData } from 'n8n-workflow';

import { getItemCountByConnectionType } from '../get-item-count-by-connection-type';

describe('getItemCountByConnectionType', () => {
	it('should return an empty object when data is undefined', () => {
		const result = getItemCountByConnectionType(undefined);
		expect(result).toEqual({});
	});

	it('should return an empty object when data is an empty object', () => {
		const result = getItemCountByConnectionType({});
		expect(result).toEqual({});
	});

	it('should count items for a single connection with single output', () => {
		const data: ITaskData['data'] = {
			main: [[{ json: { id: 1 } }, { json: { id: 2 } }]],
		};

		const result = getItemCountByConnectionType(data);
		expect(result).toEqual({
			main: [2],
		});
	});

	it('should count items for a single connection with multiple outputs', () => {
		const data: ITaskData['data'] = {
			main: [
				[{ json: { id: 1 } }, { json: { id: 2 } }],
				[{ json: { id: 3 } }],
				[{ json: { id: 4 } }, { json: { id: 5 } }, { json: { id: 6 } }],
			],
		};

		const result = getItemCountByConnectionType(data);
		expect(result).toEqual({
			main: [2, 1, 3],
		});
	});

	it('should handle multiple connection types', () => {
		const data: ITaskData['data'] = {
			main: [[{ json: { id: 1 } }, { json: { id: 2 } }]],
			ai_agent: [[{ json: { error: 'test' } }]],
			ai_memory: [
				[
					{ json: { data: 'custom' } },
					{ json: { data: 'custom2' } },
					{ json: { data: 'custom3' } },
				],
			],
		};

		const result = getItemCountByConnectionType(data);
		expect(result).toEqual({
			main: [2],
			ai_agent: [1],
			ai_memory: [3],
		});
	});

	it('should handle empty arrays in connection data', () => {
		const data: ITaskData['data'] = {
			main: [[], [{ json: { id: 1 } }], []],
		};

		const result = getItemCountByConnectionType(data);
		expect(result).toEqual({
			main: [0, 1, 0],
		});
	});

	it('should handle null values in connection data arrays', () => {
		const data: ITaskData['data'] = {
			main: [null, [{ json: { id: 1 } }], null],
		};

		const result = getItemCountByConnectionType(data);
		expect(result).toEqual({
			main: [0, 1, 0],
		});
	});

	it('should handle connection data with mixed null and valid arrays', () => {
		const data: ITaskData['data'] = {
			main: [[{ json: { id: 1 } }], null, [{ json: { id: 2 } }, { json: { id: 3 } }], null, []],
		};

		const result = getItemCountByConnectionType(data);
		expect(result).toEqual({
			main: [1, 0, 2, 0, 0],
		});
	});

	it('should discard unknown connection types', () => {
		const data: ITaskData['data'] = {
			main: [[{ json: { id: 1 } }, { json: { id: 2 } }]],
			unknownType: [[{ json: { data: 'should be ignored' } }]],
			anotherInvalid: [[{ json: { test: 'data' } }]],
		};

		const result = getItemCountByConnectionType(data);

		// Should only include 'main' and discard unknown types
		expect(result).toEqual({
			main: [2],
		});
		expect(result).not.toHaveProperty('unknownType');
		expect(result).not.toHaveProperty('anotherInvalid');
	});

	it('should handle mix of valid and invalid connection types', () => {
		const data: ITaskData['data'] = {
			invalidType1: [[{ json: { data: 'ignored' } }]],
			main: [[{ json: { id: 1 } }]],
			invalidType2: [[{ json: { data: 'also ignored' } }]],
			ai_agent: [[{ json: { error: 'test error' } }]],
			notAValidType: [[{ json: { foo: 'bar' } }]],
		};

		const result = getItemCountByConnectionType(data);

		// Should only include valid NodeConnectionTypes
		expect(result).toEqual({
			main: [1],
			ai_agent: [1],
		});
		expect(Object.keys(result)).toHaveLength(2);
	});

	it('should handle data with only invalid connection types', () => {
		const data: ITaskData['data'] = {
			fakeType1: [[{ json: { data: 'test' } }]],
			fakeType2: [[{ json: { data: 'test2' } }]],
			notReal: [[{ json: { id: 1 } }, { json: { id: 2 } }]],
		};

		const result = getItemCountByConnectionType(data);

		// Should return empty object when no valid types found
		expect(result).toEqual({});
		expect(Object.keys(result)).toHaveLength(0);
	});
});
