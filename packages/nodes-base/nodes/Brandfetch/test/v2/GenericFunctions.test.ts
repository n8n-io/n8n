import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { brandfetchApiRequest, fetchAndPrepareBinaryData } from '../../v2/GenericFunctions';

export const node: INode = {
	id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
	name: 'Brandfetch',
	type: 'n8n-nodes-base.Brandfetch',
	typeVersion: 2,
	position: [0, 0],
	parameters: {
		operation: 'data',
		type: 'domain',
		identifier: 'n8n.io',
	},
};

describe('BrandfetchV2', () => {
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

		it.each([
			['domain', 'n8n.io', '/brands/domain/n8n.io'],
			['ticker', 'AAPL', '/brands/ticker/AAPL'],
			['crypto', 'BTC', '/brands/crypto/BTC'],
			['isin', 'US0378331005', '/brands/isin/US0378331005'],
		])('should call the explicit %s route', async (_type, _identifier, resource) => {
			const method: IHttpRequestMethods = 'GET';

			await brandfetchApiRequest.call(mockThis, method, resource);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('brandfetchApi', {
				method: 'GET',
				url: `https://api.brandfetch.io/v2${resource}`,
				json: true,
			});
		});

		it('should include body and qs when they are provided', async () => {
			await brandfetchApiRequest.call(
				mockThis,
				'POST',
				'/brands/domain/n8n.io',
				{ key: 'value' },
				{ filter: 'logo' },
			);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('brandfetchApi', {
				method: 'POST',
				url: 'https://api.brandfetch.io/v2/brands/domain/n8n.io',
				json: true,
				body: { key: 'value' },
				qs: { filter: 'logo' },
			});
		});

		it('should throw NodeApiError when statusCode is not 200', async () => {
			(mockThis.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue({
				statusCode: 404,
				message: 'Not found',
			});

			await expect(
				brandfetchApiRequest.call(mockThis, 'GET', '/brands/domain/missing'),
			).rejects.toThrow(NodeApiError);
		});

		it('should wrap downstream errors as NodeApiError', async () => {
			(mockThis.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('boom'),
			);

			await expect(
				brandfetchApiRequest.call(mockThis, 'GET', '/brands/domain/n8n.io'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('fetchAndPrepareBinaryData', () => {
		let mockExec: IExecuteFunctions;
		let newItem: INodeExecutionData;
		let httpRequestMock: jest.Mock;
		let prepareBinaryDataMock: jest.Mock;

		beforeEach(() => {
			newItem = { json: {}, binary: {} };
			httpRequestMock = jest.fn().mockResolvedValue(Buffer.from('image-bytes'));
			prepareBinaryDataMock = jest.fn().mockResolvedValue({ data: 'prepared' });
			mockExec = {
				helpers: {
					httpRequest: httpRequestMock,
					prepareBinaryData: prepareBinaryDataMock,
				},
				getNode: () => node,
			} as unknown as IExecuteFunctions;
		});

		it('should download a logo from a trusted host and attach binary data', async () => {
			await fetchAndPrepareBinaryData.call(
				mockExec,
				'logo',
				'png',
				{ src: 'https://cdn.brandfetch.io/n8n.io/logo.png', format: 'png' },
				'n8n.io',
				newItem,
			);

			expect(httpRequestMock).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://cdn.brandfetch.io/n8n.io/logo.png',
				encoding: 'arraybuffer',
				json: false,
				returnFullResponse: false,
				disableFollowRedirect: true,
			});
			expect(prepareBinaryDataMock).toHaveBeenCalledWith(expect.any(Buffer), 'logo_n8n.io.png');
			expect(newItem.binary).toEqual({ logo_png: { data: 'prepared' } });
		});

		it('should append the suffix to the binary key', async () => {
			await fetchAndPrepareBinaryData.call(
				mockExec,
				'icon',
				'svg',
				{ src: 'https://cdn.brandfetch.io/icon.svg' },
				'n8n.io',
				newItem,
				'_1',
			);

			expect(newItem.binary).toHaveProperty('icon_svg_1');
		});

		it('should sanitise unsafe characters in the identifier for the filename', async () => {
			await fetchAndPrepareBinaryData.call(
				mockExec,
				'logo',
				'png',
				{ src: 'https://cdn.brandfetch.io/logo.png' },
				'AAPL US/EQUITY',
				newItem,
			);

			expect(prepareBinaryDataMock).toHaveBeenCalledWith(
				expect.any(Buffer),
				'logo_AAPL_US_EQUITY.png',
			);
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

			expect(httpRequestMock).toHaveBeenCalled();
		});

		it('should reject when src is missing', async () => {
			await expect(
				fetchAndPrepareBinaryData.call(mockExec, 'logo', 'png', {}, 'n8n.io', newItem),
			).rejects.toThrow(NodeOperationError);
			expect(httpRequestMock).not.toHaveBeenCalled();
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
	});
});
