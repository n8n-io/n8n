import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import nock from 'nock';

import { BaserowTrigger } from '../../../BaserowTrigger.node';
import { baserowApiRequestAllItems, getTableFields } from '../../../GenericFunctions';
import type { GetAllAdditionalOptions } from '../../../types';

jest.mock('../../../GenericFunctions', () => {
	const originalModule: { [key: string]: any } = jest.requireActual('../../../GenericFunctions');
	return {
		...originalModule,
		baserowApiRequestAllItems: jest.fn(),
		getJwtToken: jest.fn().mockResolvedValue('jwt'),
		getTableFields: jest.fn(),
	};
});

describe('Baserow Trigger Node', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2024-12-10T12:57:41Z'));
	});

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../GenericFunctions');
	});

	describe('trigger', () => {
		it('should not trigger when no new record', async () => {
			const mockThis = {
				helpers: {
					returnJsonArray,
					constructExecutionMetaData,
					httpRequest: jest.fn().mockResolvedValue({
						count: 0,
						next: null,
						previous: null,
						results: [],
					}),
				},
				getWorkflowStaticData() {
					return {
						node: {},
					};
				},
				getMode() {
					return 'auto';
				},
				getNode() {
					return {
						id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
						name: 'Baserow Trigger',
						type: 'n8n-nodes-base.baserowTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							databaseId: 1,
							tableId: 1,
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
						case 'databaseId':
							return 1;
						case 'tableId':
							return 1;
						case 'additionalFields':
							return { viewId: 1 };
						case 'additionalOptions':
							return {} as GetAllAdditionalOptions;
						default:
							return undefined;
					}
				},
				continueOnFail: () => false,
			} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

			getTableFields.mockResolvedValue([
				{
					id: '1',
					name: 'my_field_name',
				},
			]);

			baserowApiRequestAllItems.mockResolvedValue([]);

			const node = new BaserowTrigger();
			const response: INodeExecutionData[][] | null = await node.poll.call(mockThis);

			expect(baserowApiRequestAllItems).toHaveBeenCalledTimes(1);
			expect(getTableFields).toHaveBeenCalled();

			expect(response).toBeNull();
		});
		it('should trigger when new record', async () => {
			const mockThis = {
				helpers: {
					returnJsonArray,
					constructExecutionMetaData,
					httpRequest: jest.fn().mockResolvedValue({
						count: 1,
						next: null,
						previous: null,
						results: [
							{
								id: 1,
								order: '^-?\\(?:\\.\\)?$',
								field_1: 'baz',
							},
						],
					}),
				},
				getMode() {
					return 'auto';
				},
				getWorkflowStaticData() {
					return {
						node: {},
					};
				},
				getNode() {
					return {
						id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
						name: 'Baserow Trigger',
						type: 'n8n-nodes-base.baserowTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							databaseId: 1,
							tableId: 1,
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
						case 'databaseId':
							return 1;
						case 'tableId':
							return 1;
						case 'triggerField':
							return 'changed_at';
						case 'additionalOptions':
							return {} as GetAllAdditionalOptions;
						case 'additionalFields':
							return { viewId: 1 };
						default:
							return undefined;
					}
				},
				continueOnFail: () => false,
			} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

			baserowApiRequestAllItems.mockResolvedValue([
				{
					id: 1,
					order: '^-?\\(?:\\.\\)?$',
					field_1: 'baz',
				},
			]);

			getTableFields.mockResolvedValue([
				{
					id: '1',
					name: 'my_field_name',
				},
			]);

			const node = new BaserowTrigger();
			const response: INodeExecutionData[][] | null = await node.poll.call(mockThis);

			expect(getTableFields).toHaveBeenCalledTimes(1);
			expect(baserowApiRequestAllItems).toHaveBeenCalledTimes(1);
			expect(baserowApiRequestAllItems).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/api/database/rows/table/1/',
				undefined,
				{},
				{ filter__changed_at__date_after: 'Africa/Abidjan?2024-12-10T12:57:41Z', view_id: 1 },
			);

			expect(response).toEqual([
				[
					{
						json: {
							id: 1,
							order: '^-?\\(?:\\.\\)?$',
							my_field_name: 'baz',
						},
					},
				],
			]);
		});
	});
});
