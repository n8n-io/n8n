import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
} from 'n8n-workflow';

import { baserowApiRequest, baserowFileUploadRequest, getJwtToken } from '../GenericFunctions';
import { username } from 'minifaker';
import { httpRequest } from 'n8n-core';

export const node: INode = {
	id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
	name: 'Baserow Upload',
	type: 'n8n-nodes-base.Baserow',
	typeVersion: 1,
	position: [0, 0],
	parameters: {
		operation: 'upload',
		domain: 'file',
	},
};

describe('Baserow GenericFunctions', () => {
	describe('getJwtToken', () => {
		const mockThis = {
			helpers: {
				httpRequest: jest.fn().mockResolvedValue({
					token: 'jwt',
				}),
			},
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

		it('should return the JWT token', async () => {
			const jwtToken = await getJwtToken.call(mockThis, {
				username: 'user',
				password: 'password',
				host: 'https://my-host.com',
			});

			expect(jwtToken).toBe('jwt');
		});
	});

	describe('baserowApiRequest', () => {
		const mockThis = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ statusCode: 200 }),
				httpRequest: jest.fn(),
			},
			getNode() {
				return node;
			},
			getCredentials: jest.fn(),
			getNodeParameter: jest.fn(),
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

		it('should upload a file via url', async () => {
			mockThis.getCredentials.mockResolvedValue({
				host: 'https://my-host.com',
			});

			mockThis.helpers.httpRequest.mockResolvedValue({
				statusCode: 200,
				body: {
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
			} as IN8nHttpFullResponse | IN8nHttpResponse);

			const jwtToken = 'jwt';
			const fileUrl = 'http://example.com/image.png';

			const body = {
				file_url: fileUrl,
			};

			await baserowApiRequest.call(
				mockThis,
				'POST',
				'/api/user-files/upload-via-url/',
				jwtToken,
				body,
			);

			expect(mockThis.getCredentials).toHaveBeenCalledWith('baserowApi');
			expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith({
				headers: {
					Authorization: `JWT ${jwtToken}`,
				},
				method: 'POST',
				url: 'https://my-host.com/api/user-files/upload-via-url/',
				body,
				json: true,
			});
		});
	});

	describe('baserowFileUploadRequest', () => {
		const mockThis = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ statusCode: 200 }),
				httpRequest: jest.fn(),
			},
			getNode() {
				return node;
			},
			getCredentials: jest.fn(),
			getNodeParameter: jest.fn(),
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

		it('should make an authenticated API file-upload request to Baserow', async () => {
			mockThis.getCredentials.mockResolvedValue({
				host: 'https://my-host.com',
			});

			// see https://api.baserow.io/api/redoc/#tag/User-files/operation/upload_file
			mockThis.helpers.httpRequest.mockResolvedValue({
				statusCode: 200,
				body: {
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
			} as IN8nHttpFullResponse | IN8nHttpResponse);

			const jwtToken = 'jwt';
			const file = Buffer.from('file');
			const filename = 'filename.txt';
			const mimeType = 'text/plain';

			await baserowFileUploadRequest.call(mockThis, jwtToken, file, filename, mimeType);

			expect(mockThis.getCredentials).toHaveBeenCalledWith('baserowApi');

			expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith({
				body: {
					file: {
						options: { contentType: 'text/plain', filename: 'filename.txt' },
						value: file,
					},
				},
				headers: { Authorization: 'JWT jwt', 'Content-Type': 'multipart/form-data' },
				json: false,
				method: 'POST',
				url: 'https://my-host.com/api/user-files/upload-file/',
			});
		});
	});
});
