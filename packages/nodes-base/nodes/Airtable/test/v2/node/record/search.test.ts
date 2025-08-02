import * as search from '../../../../v2/actions/record/search.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function (method: string) {
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
					],
				};
			}
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

describe('Test AirtableV2, search operation', () => {
	it('should return all records', async () => {
		const nodeParameters = {
			operation: 'search',
			filterByFormula: 'foo',
			returnAll: true,
			options: {
				fields: ['foo', 'bar'],
				view: {
					value: 'viwView',
					mode: 'list',
				},
			},
			sort: {
				property: [
					{
						field: 'bar',
						direction: 'desc',
					},
				],
			},
		};

		const items = [
			{
				json: {},
			},
		];

		const result = await search.execute.call(
			createMockExecuteFunction(nodeParameters),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(transport.apiRequestAllItems).toHaveBeenCalledTimes(1);
		expect(transport.apiRequestAllItems).toHaveBeenCalledWith(
			'GET',
			'appYoLbase/tblltable',
			{},
			{
				fields: ['foo', 'bar'],
				filterByFormula: 'foo',
				sort: [{ direction: 'desc', field: 'bar' }],
				view: 'viwView',
			},
		);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			json: { id: 'recYYY', foo: 'foo 2', bar: 'bar 2' },
			pairedItem: [
				{
					item: 0,
				},
			],
		});
	});

	it('should return all records', async () => {
		const nodeParameters = {
			operation: 'search',
			filterByFormula: 'foo',
			returnAll: false,
			limit: 1,
			options: {
				fields: ['foo', 'bar'],
			},
			sort: {},
		};

		const items = [
			{
				json: {},
			},
		];

		const result = await search.execute.call(
			createMockExecuteFunction(nodeParameters),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'GET',
			'appYoLbase/tblltable',
			{},
			{ fields: ['foo', 'bar'], filterByFormula: 'foo', maxRecords: 1 },
		);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			json: { id: 'recYYY', foo: 'foo 2', bar: 'bar 2' },
			pairedItem: [
				{
					item: 0,
				},
			],
		});
	});
});
