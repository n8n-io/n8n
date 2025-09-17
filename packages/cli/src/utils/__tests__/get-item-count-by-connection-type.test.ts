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
			error: [[{ json: { error: 'test' } }]],
			custom: [
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
			error: [1],
			custom: [3],
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
});
