import { mockDeep } from 'jest-mock-extended';
import get from 'lodash/get';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as getSchema from '../../../../v2/actions/base/getSchema.operation';
import * as transport from '../../../../v2/transport';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return { tables: [] };
		}),
	};
});

describe('Test AirtableV2, base => getSchema', () => {
	it('should return all bases', async () => {
		const nodeParameters = {
			resource: 'base',
			operation: 'getSchema',
			base: {
				value: '={{$json.id}}',
			},
		};

		const items = [
			{
				json: { id: 'appYobase1' },
			},
			{
				json: { id: 'appYobase2' },
			},
		];

		await getSchema.execute.call(
			mockDeep<IExecuteFunctions>({
				getInputData: jest.fn(() => items),
				getNodeParameter: jest.fn((param: string, itemIndex: number) => {
					if (param === 'base') {
						return items[itemIndex].json.id;
					}

					return get(nodeParameters, param);
				}),
			}),
			items,
		);

		expect(transport.apiRequest).toBeCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appYobase1/tables');
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appYobase2/tables');
	});
});
