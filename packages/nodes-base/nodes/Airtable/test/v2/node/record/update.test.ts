import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as update from '../../../../v2/actions/record/update.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {};
		}),
		batchUpdate: jest.fn(async function () {
			return {};
		}),
		apiRequestAllItems: jest.fn(async function (method: string) {
			if (method === 'GET') {
				return {
					records: [
						{
							id: 'recYYY',
							fields: {
								foo: 'foo 2',
								bar: 'bar 2',
							},
						},
						{
							id: 'recXXX',
							fields: {
								foo: 'foo 1',
								bar: 'bar 1',
							},
						},
					],
				};
			}
		}),
	};
});

describe('Test AirtableV2, update operation', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should skip validation if typecast option is true', async () => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.helpers.constructExecutionMetaData = jest.fn(() => []);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'columns.mappingMode') {
				return 'defineBelow';
			}
			if (key === 'columns.matchingColumns') {
				return ['id'];
			}
			if (key === 'options') {
				return {
					typecast: true,
				};
			}
			if (key === 'columns.value') {
				return {
					id: 'recXXX',
					field1: 'foo 1',
					field2: 'bar 1',
				};
			}
			return undefined;
		});

		await update.execute.call(mockExecuteFunctions, [{ json: {} }], 'base', 'table');

		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('columns.value', 0, [], {
			skipValidation: true,
		});
	});

	it('should update a record by id, autoMapInputData', async () => {
		const nodeParameters = {
			operation: 'update',
			columns: {
				mappingMode: 'autoMapInputData',
				matchingColumns: ['id'],
			},
			options: {},
		};

		const items = [
			{
				json: {
					id: 'recXXX',
					foo: 'foo 1',
					bar: 'bar 1',
				},
			},
		];

		await update.execute.call(
			createMockExecuteFunction(nodeParameters),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(transport.batchUpdate).toHaveBeenCalledWith(
			'appYoLbase/tblltable',
			{ typecast: false },
			[{ fields: { bar: 'bar 1', foo: 'foo 1' }, id: 'recXXX' }],
		);
	});

	it('should update a record by field name, autoMapInputData', async () => {
		const nodeParameters = {
			operation: 'update',
			columns: {
				mappingMode: 'autoMapInputData',
				matchingColumns: ['foo'],
			},
			options: {},
		};

		const items = [
			{
				json: {
					id: 'recXXX',
					foo: 'foo 1',
					bar: 'bar 1',
				},
			},
		];

		await update.execute.call(
			createMockExecuteFunction(nodeParameters),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(transport.batchUpdate).toHaveBeenCalledWith(
			'appYoLbase/tblltable',
			{ typecast: false },
			[{ fields: { bar: 'bar 1', foo: 'foo 1', id: 'recXXX' }, id: 'recXXX' }],
		);
	});
});
