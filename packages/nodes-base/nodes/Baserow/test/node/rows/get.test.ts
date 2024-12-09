import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import nock from 'nock';

import { Baserow } from '../../../Baserow.node';
import { baserowApiRequest, getTableFields } from '../../../GenericFunctions';
import type { GetAllAdditionalOptions } from '../../../types';

jest.mock('../../../GenericFunctions', () => {
	const originalModule: { [key: string]: any } = jest.requireActual('../../../GenericFunctions');
	return {
		...originalModule,
		baserowApiRequest: jest.fn().mockResolvedValue({
			id: 1,
			order: '^-?\\(?:\\.\\)?$',
			field_1: 'baz',
		}),
		getJwtToken: jest.fn().mockResolvedValue('jwt'),
		getTableFields: jest.fn().mockResolvedValue([
			{
				id: '1',
				name: 'my_field_name',
			},
		]),
	};
});

describe('Baserow Node', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../GenericFunctions');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('resource: row', () => {
		it('get should fetch a record', async () => {
			const mockThis = {
				helpers: {
					returnJsonArray,
					constructExecutionMetaData,
					httpRequest: jest.fn().mockResolvedValue({
						count: 1,
						next: null,
						previous: null,
						results: {
							id: 1,
							order: '^-?\\(?:\\.\\)?$',
							field_1: 'baz',
						},
					}),
				},
				getNode() {
					return {
						id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
						name: 'Baserow get',
						type: 'n8n-nodes-base.Baserow',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'get',
							resource: 'row',
							tableId: 1,
							rowId: 1,
						},
					} as INode;
				},
				getCredentials: jest.fn().mockResolvedValue({
					username: 'user',
					password: 'password',
					host: 'https://my-host.com',
				}),
				getInputData: () => [
					{
						json: {},
					},
				],
				getNodeParameter: (parameter: string) => {
					switch (parameter) {
						case 'resource':
							return 'row';
						case 'operation':
							return 'get';
						case 'tableId':
							return 1;
						case 'rowId':
							return 1;
						case 'additionalOptions':
							return {} as GetAllAdditionalOptions;
						default:
							return undefined;
					}
				},
				continueOnFail: () => false,
			} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

			const node = new Baserow();
			const response: INodeExecutionData[][] = await node.execute.call(mockThis);

			expect(getTableFields).toHaveBeenCalledTimes(1);
			expect(baserowApiRequest).toHaveBeenCalledTimes(1);
			expect(baserowApiRequest).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/api/database/rows/table/1/1/',
				'jwt',
			);

			expect(response).toEqual([
				[
					{
						json: {
							id: 1,
							order: '^-?\\(?:\\.\\)?$',
							my_field_name: 'baz',
						},
						pairedItem: {
							item: 0,
						},
					},
				],
			]);
		});
	});
});
