import * as get from '../../../../v2/actions/record/get.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function (method: string) {
			if (method === 'GET') {
				return {
					id: 'recXXX',
					fields: {
						foo: 'foo 1',
						bar: 'bar 1',
					},
				};
			}
		}),
	};
});

describe('Test AirtableV2, create operation', () => {
	it('should create a record, autoMapInputData', async () => {
		const nodeParameters = {
			operation: 'get',
			id: 'recXXX',
			options: {},
		};

		const items = [
			{
				json: {},
			},
		];

		const responce = await get.execute.call(
			createMockExecuteFunction(nodeParameters),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'appYoLbase/tblltable/recXXX');

		expect(responce).toEqual([
			{
				json: {
					id: 'recXXX',
					foo: 'foo 1',
					bar: 'bar 1',
				},
				pairedItem: {
					item: 0,
				},
			},
		]);
	});
});
