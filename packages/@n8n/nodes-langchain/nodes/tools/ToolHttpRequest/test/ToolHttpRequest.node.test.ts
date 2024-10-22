import type { IExecuteFunctions } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import type { N8nTool } from '../../../../utils/N8nTool';
import { ToolHttpRequest } from '../ToolHttpRequest.node';

describe('ToolHttpRequest', () => {
	let httpTool: ToolHttpRequest;
	let executeFunctions: IExecuteFunctions;

	describe('Binary response', () => {
		beforeEach(() => {
			httpTool = new ToolHttpRequest();
			executeFunctions = {
				addInputData: jest.fn().mockResolvedValue({ index: 0 }),
				addOutputData: jest.fn(),
				getInputData: jest.fn(),
				getNodeParameter: jest.fn(),
				getNode: jest.fn(() => {
					return {
						type: 'n8n-nodes-base.httpRequest',
						name: 'HTTP Request',
						typeVersion: 1.1,
					};
				}),
				getCredentials: jest.fn(),
				helpers: {
					httpRequest: jest.fn(),
					httpRequestWithAuthentication: jest.fn(),
					request: jest.fn(),
					requestOAuth1: jest.fn(
						async () =>
							await Promise.resolve({
								statusCode: 200,
								headers: { 'content-type': 'application/json' },
								body: Buffer.from(JSON.stringify({ success: true })),
							}),
					),
					requestOAuth2: jest.fn(
						async () =>
							await Promise.resolve({
								statusCode: 200,
								headers: { 'content-type': 'application/json' },
								body: Buffer.from(JSON.stringify({ success: true })),
							}),
					),
					requestWithAuthentication: jest.fn(),
					requestWithAuthenticationPaginated: jest.fn(),
					assertBinaryData: jest.fn(),
					getBinaryStream: jest.fn(),
					getBinaryMetadata: jest.fn(),
					binaryToString: jest.fn((buffer: Buffer) => {
						return buffer.toString();
					}),
					prepareBinaryData: jest.fn(),
				},
				getContext: jest.fn(),
				sendMessageToUI: jest.fn(),
				continueOnFail: jest.fn(),
				getMode: jest.fn(),
			} as unknown as IExecuteFunctions;
		});

		it('should return the error when receiving a binary response', async () => {
			(executeFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				body: Buffer.from(''),
				headers: {
					'content-type': 'image/jpeg',
				},
			});

			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return 'https://httpbin.org/image/jpeg';
					case 'options':
						return {};
					case 'placeholderDefinitions.values':
						return [];
					default:
						return undefined;
				}
			});

			const { response } = await httpTool.supplyData.call(executeFunctions, 0);

			const res = await (response as N8nTool).invoke({});
			expect(executeFunctions.helpers.httpRequest as jest.Mock).toHaveBeenCalled();
			expect(res).toContain('error');
			expect(res).toContain('Binary data is not supported');
		});

		it('should return the response text when receiving a text response', async () => {
			(executeFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				body: 'Hello World',
				headers: {
					'content-type': 'text/plain',
				},
			});

			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return 'https://httpbin.org/text/plain';
					case 'options':
						return {};
					case 'placeholderDefinitions.values':
						return [];
					default:
						return undefined;
				}
			});

			const { response } = await httpTool.supplyData.call(executeFunctions, 0);

			const res = await (response as N8nTool).invoke({});
			expect(executeFunctions.helpers.httpRequest as jest.Mock).toHaveBeenCalled();
			expect(res).toEqual('Hello World');
		});

		it('should return the response text when receiving a text response with a charset', async () => {
			(executeFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				body: 'こんにちは世界',
				headers: {
					'content-type': 'text/plain; charset=iso-2022-jp',
				},
			});

			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return 'https://httpbin.org/text/plain';
					case 'options':
						return {};
					case 'placeholderDefinitions.values':
						return [];
					default:
						return undefined;
				}
			});

			const { response } = await httpTool.supplyData.call(executeFunctions, 0);

			const res = await (response as N8nTool).invoke({});
			expect(executeFunctions.helpers.httpRequest as jest.Mock).toHaveBeenCalled();
			expect(res).toEqual('こんにちは世界');
		});

		it('should return the response object when receiving a JSON response', async () => {
			const mockJson = { hello: 'world' };

			(executeFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				body: JSON.stringify(mockJson),
				headers: {
					'content-type': 'application/json',
				},
			});

			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return 'https://httpbin.org/json';
					case 'options':
						return {};
					case 'placeholderDefinitions.values':
						return [];
					default:
						return undefined;
				}
			});

			const { response } = await httpTool.supplyData.call(executeFunctions, 0);

			const res = await (response as N8nTool).invoke({});
			expect(executeFunctions.helpers.httpRequest as jest.Mock).toHaveBeenCalled();
			expect(jsonParse(res)).toEqual(mockJson);
		});

		it('should handle authentication with predefined credentials', async () => {
			(executeFunctions.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				body: 'Hello World',
				headers: {
					'content-type': 'text/plain',
				},
			});

			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return 'https://httpbin.org/text/plain';
					case 'authentication':
						return 'predefinedCredentialType';
					case 'nodeCredentialType':
						return 'linearApi';
					case 'options':
						return {};
					case 'placeholderDefinitions.values':
						return [];
					default:
						return undefined;
				}
			});

			const { response } = await httpTool.supplyData.call(executeFunctions, 0);

			const res = await (response as N8nTool).invoke({});

			expect(res).toEqual('Hello World');

			expect(
				executeFunctions.helpers.httpRequestWithAuthentication as jest.Mock,
			).toHaveBeenCalledWith(
				'linearApi',
				expect.objectContaining({
					returnFullResponse: true,
				}),
				undefined,
			);
		});

		it('should handle authentication with generic credentials', async () => {
			(executeFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				body: 'Hello World',
				headers: {
					'content-type': 'text/plain',
				},
			});

			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return 'https://httpbin.org/text/plain';
					case 'authentication':
						return 'genericCredentialType';
					case 'genericAuthType':
						return 'httpBasicAuth';
					case 'options':
						return {};
					case 'placeholderDefinitions.values':
						return [];
					default:
						return undefined;
				}
			});

			(executeFunctions.getCredentials as jest.Mock).mockResolvedValue({
				user: 'username',
				password: 'password',
			});

			const { response } = await httpTool.supplyData.call(executeFunctions, 0);

			const res = await (response as N8nTool).invoke({});

			expect(res).toEqual('Hello World');

			expect(executeFunctions.helpers.httpRequest as jest.Mock).toHaveBeenCalledWith(
				expect.objectContaining({
					returnFullResponse: true,
					auth: expect.objectContaining({
						username: 'username',
						password: 'password',
					}),
				}),
			);
		});
	});
});
