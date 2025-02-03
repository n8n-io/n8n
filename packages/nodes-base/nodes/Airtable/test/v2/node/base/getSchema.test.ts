import * as getSchema from '../../../../v2/actions/base/getSchema.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {};
		}),
	};
});

describe('Test AirtableV2, base => getSchema', () => {
	it('should return all bases', async () => {
		const nodeParameters = {
			resource: 'base',
			operation: 'getSchema',
			base: {
				value: 'appYobase',
			},
		};

		const items = [
			{
				json: {},
			},
		];

		await getSchema.execute.call(createMockExecuteFunction(nodeParameters), items);

		expect(transport.apiRequest).toBeCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appYobase/tables');
	});
});
