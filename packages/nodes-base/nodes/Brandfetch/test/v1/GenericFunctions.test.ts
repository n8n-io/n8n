import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { brandfetchApiRequest, fetchAndPrepareBinaryData } from '../../v1/GenericFunctions';

export const node: INode = {
	id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
	name: 'Brandfetch',
	type: 'n8n-nodes-base.Brandfetch',
	typeVersion: 1,
	position: [0, 0],
	parameters: {
		operation: 'font',
		domain: 'n8n.io',
	},
};

describe('BrandfetchV1', () => {
	describe('brandfetchApiRequest', () => {
		const mockThis = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ statusCode: 200 }),
			},
			getNode() {
				return node;
			},
			getNodeParameter: jest.fn(),
		} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

		beforeEach(() => {
			jest.clearAllMocks();
			(mockThis.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				statusCode: 200,
			});
		});

		it('should make an authenticated API request to Brandfetch', async () => {
			const method: IHttpRequestMethods = 'GET';
			const resource = '/brands/n8n.io';

			await brandfetchApiRequest.call(mockThis, method, resource);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('brandfetchApi', {
				method: 'GET',
				url: 'https://api.brandfetch.io/v2/brands/n8n.io',
				json: true,
			});
		});

		it('should include body and qs when they are provided', async () => {
			await brandfetchApiRequest.call(
				mockThis,
				'POST',
				'/brands/n8n.io',
				{ key: 'value' },
				{ filter: 'logo' },
			);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('brandfetchApi', {
				method: 'POST',
				url: 'https://api.brandfetch.io/v2/brands/n8n.io',
				json: true,
				body: { key: 'value' },
				qs: { filter: 'logo' },
			});
		});

		it('should strip headers when operation is logo and json is disabled', async () => {
			(mockThis.getNodeParameter as jest.Mock).mockReturnValue('logo');
			const requestMock = mockThis.helpers.requestWithAuthentication as jest.Mock;
			requestMock.mockResolvedValue(Buffer.from('binary'));

			await brandfetchApiRequest.call(
				mockThis,
				'GET',
				'',
				{},
				{},
				'https://cdn.brandfetch.io/logo.png',
				{ json: false, encoding: null, headers: { accept: 'image/*' } },
			);

			const calledWith = requestMock.mock.calls[0][1] as {
				headers?: unknown;
				json?: boolean;
				url?: string;
			};
			expect(calledWith.headers).toBeUndefined();
			expect(calledWith.json).toBe(false);
			expect(calledWith.url).toBe('https://cdn.brandfetch.io/logo.png');
		});

		it('should throw NodeApiError when response statusCode is not 200', async () => {
			(mockThis.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				statusCode: 404,
				message: 'Not found',
			});

			await expect(brandfetchApiRequest.call(mockThis, 'GET', '/brands/missing')).rejects.toThrow(
				NodeApiError,
			);
		});

		it('should wrap downstream errors as NodeApiError', async () => {
			(mockThis.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('boom'),
			);

			await expect(brandfetchApiRequest.call(mockThis, 'GET', '/brands/n8n.io')).rejects.toThrow(
				NodeApiError,
			);
		});
	});

	describe('fetchAndPrepareBinaryData', () => {
		let mockExec: IExecuteFunctions;
		let newItem: INodeExecutionData;

		beforeEach(() => {
			newItem = { json: {}, binary: {} };
			mockExec = {
				helpers: {
					requestWithAuthentication: jest.fn().mockResolvedValue(Buffer.from('image-bytes')),
					prepareBinaryData: jest.fn().mockResolvedValue({ data: 'prepared' }),
				},
				getNode: () => node,
				getNodeParameter: jest.fn().mockReturnValue('logo'),
			} as unknown as IExecuteFunctions;
		});

		it('should download a logo from a trusted .brandfetch.io host and attach binary data', async () => {
			await fetchAndPrepareBinaryData.call(
				mockExec,
				'logo',
				'png',
				{ src: 'https://cdn.brandfetch.io/n8n.io/logo.png', format: 'png' },
				'n8n.io',
				newItem,
			);

			expect(mockExec.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'brandfetchApi',
				expect.objectContaining({
					method: 'GET',
					url: 'https://cdn.brandfetch.io/n8n.io/logo.png',
					json: false,
					encoding: null,
				}),
			);
			expect(mockExec.helpers.prepareBinaryData).toHaveBeenCalledWith(
				expect.any(Buffer),
				'logo_n8n.io.png',
			);
			expect(newItem.binary).toEqual({ logo_png: { data: 'prepared' } });
		});

		it('should accept logos hosted on .brandfetch.com', async () => {
			await fetchAndPrepareBinaryData.call(
				mockExec,
				'icon',
				'svg',
				{ src: 'https://assets.brandfetch.com/icon.svg' },
				'n8n.io',
				newItem,
			);

			expect(mockExec.helpers.requestWithAuthentication).toHaveBeenCalled();
			expect(newItem.binary).toHaveProperty('icon_svg');
		});

		it('should reject when src is missing', async () => {
			await expect(
				fetchAndPrepareBinaryData.call(mockExec, 'logo', 'png', {}, 'n8n.io', newItem),
			).rejects.toThrow(NodeOperationError);
			expect(mockExec.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should reject when src is not a string', async () => {
			await expect(
				fetchAndPrepareBinaryData.call(mockExec, 'logo', 'png', { src: 123 }, 'n8n.io', newItem),
			).rejects.toThrow(NodeOperationError);
		});

		it('should reject when src is not a valid URL', async () => {
			await expect(
				fetchAndPrepareBinaryData.call(
					mockExec,
					'logo',
					'png',
					{ src: 'not-a-url' },
					'n8n.io',
					newItem,
				),
			).rejects.toThrow(NodeOperationError);
		});

		it('should reject non-https URLs', async () => {
			await expect(
				fetchAndPrepareBinaryData.call(
					mockExec,
					'logo',
					'png',
					{ src: 'http://cdn.brandfetch.io/logo.png' },
					'n8n.io',
					newItem,
				),
			).rejects.toThrow(NodeOperationError);
		});

		it('should reject URLs pointing to an untrusted host', async () => {
			await expect(
				fetchAndPrepareBinaryData.call(
					mockExec,
					'logo',
					'png',
					{ src: 'https://evil.example.com/logo.png' },
					'n8n.io',
					newItem,
				),
			).rejects.toThrow(NodeOperationError);
		});

		it('should reject URLs that masquerade with a trusted suffix in the path', async () => {
			await expect(
				fetchAndPrepareBinaryData.call(
					mockExec,
					'logo',
					'png',
					{ src: 'https://evil.com/.brandfetch.io/logo.png' },
					'n8n.io',
					newItem,
				),
			).rejects.toThrow(NodeOperationError);
		});
	});
});
