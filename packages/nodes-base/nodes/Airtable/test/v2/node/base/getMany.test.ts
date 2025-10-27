import * as getMany from '../../../../v2/actions/base/getMany.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';

const bases = [
	{
		id: 'appXXX',
		name: 'base 1',
		permissionLevel: 'create',
	},
	{
		id: 'appYYY',
		name: 'base 2',
		permissionLevel: 'edit',
	},
	{
		id: 'appZZZ',
		name: 'base 3',
		permissionLevel: 'create',
	},
];

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return { bases };
		}),
	};
});

describe('Test AirtableV2, base => getMany', () => {
	it('should return all bases', async () => {
		const nodeParameters = {
			resource: 'base',
			returnAll: true,
			options: {},
		};

		const response = await getMany.execute.call(createMockExecuteFunction(nodeParameters));

		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases');

		expect(response).toEqual([
			{
				json: {
					id: 'appXXX',
					name: 'base 1',
					permissionLevel: 'create',
				},
				pairedItem: [
					{
						item: 0,
					},
				],
			},
			{
				json: {
					id: 'appYYY',
					name: 'base 2',
					permissionLevel: 'edit',
				},
				pairedItem: [
					{
						item: 0,
					},
				],
			},
			{
				json: {
					id: 'appZZZ',
					name: 'base 3',
					permissionLevel: 'create',
				},
				pairedItem: [
					{
						item: 0,
					},
				],
			},
		]);
	});

	it('should return one base with edit permission', async () => {
		const nodeParameters = {
			resource: 'base',
			returnAll: false,
			limit: 2,
			options: { permissionLevel: ['edit'] },
		};

		const response = await getMany.execute.call(createMockExecuteFunction(nodeParameters));

		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases');

		expect(response).toEqual([
			{
				json: {
					id: 'appYYY',
					name: 'base 2',
					permissionLevel: 'edit',
				},
				pairedItem: [
					{
						item: 0,
					},
				],
			},
		]);
	});
});
