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
			size: 2147483647,
			mime_type: 'string',
			is_image: true,
			image_width: 32767,
			image_height: 32767,
			uploaded_at: '2019-08-24T14:15:22Z',
			url: 'http://example.com',
			thumbnails: {
				property1: null,
				property2: null,
			},
			name: 'string',
			original_name: 'string',
		}),
		getJwtToken: jest.fn().mockResolvedValue('jwt'),
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

	describe('resource: file', () => {
		it('upload-via-url should upload a file via url', async () => {
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
						name: 'Baserow upload-via-url',
						type: 'n8n-nodes-base.Baserow',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'upload-via-url',
							resource: 'file',
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
							return 'file';
						case 'operation':
							return 'upload-via-url';
						case 'url':
							return 'https://example.com/image.jpg';
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
			expect(baserowApiRequest).toHaveBeenCalledTimes(1);
			expect(baserowApiRequest).toHaveBeenNthCalledWith(
				1,
				'POST',
				'/api/user-files/upload-via-url/',
				'jwt',
				{ url: 'https://example.com/image.jpg' },
			);

			expect(response).toEqual([
				[
					{
						json: {
							image_height: 32767,
							image_width: 32767,
							is_image: true,
							mime_type: 'string',
							name: 'string',
							original_name: 'string',
							size: 2147483647,
							thumbnails: { property1: null, property2: null },
							uploaded_at: '2019-08-24T14:15:22Z',
							url: 'http://example.com',
						},
						pairedItem: { item: 0 },
					},
				],
			]);
		});
	});
});
