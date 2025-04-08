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
