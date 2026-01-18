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
import { baserowFileUploadRequest } from '../../../GenericFunctions';
import type { GetAllAdditionalOptions } from '../../../types';

jest.mock('../../../GenericFunctions', () => {
	const originalModule: { [key: string]: any } = jest.requireActual('../../../GenericFunctions');
	return {
		...originalModule,
		baserowFileUploadRequest: jest.fn().mockResolvedValue({
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
		it('upload should upload a file', async () => {
			const buffer = Buffer.from('test');

			const mockThis = {
				helpers: {
					returnJsonArray,
					constructExecutionMetaData,
					assertBinaryData: jest
						.fn()
						.mockReturnValue({ fileName: 'test.png', mimeType: 'image/png' }),
					getBinaryDataBuffer: jest.fn().mockResolvedValue(buffer),
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
						name: 'Baserow upload',
						type: 'n8n-nodes-base.Baserow',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'upload',
							resource: 'file',
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
							return 'upload';
						case 'url':
							return 'https://example.com/image.jpg';
						case 'additionalOptions':
							return {} as GetAllAdditionalOptions;
						case 'binaryPropertyName':
							return 'data';
						default:
							return undefined;
					}
				},
				continueOnFail: () => false,
			} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

			const node = new Baserow();
			const response: INodeExecutionData[][] = await node.execute.call(mockThis);

			expect(mockThis.helpers.assertBinaryData).toHaveBeenCalledTimes(1);
			expect(mockThis.helpers.getBinaryDataBuffer).toHaveBeenCalledTimes(1);

			expect(baserowFileUploadRequest).toHaveBeenCalledTimes(1);
			expect(baserowFileUploadRequest).toHaveBeenNthCalledWith(
				1,
				'jwt',
				buffer,
				'test.png',
				'image/png',
			);

			expect(response).toEqual([
				[
					{
						json: {
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
						},
						pairedItem: { item: 0 },
					},
				],
			]);
		});
	});
});
