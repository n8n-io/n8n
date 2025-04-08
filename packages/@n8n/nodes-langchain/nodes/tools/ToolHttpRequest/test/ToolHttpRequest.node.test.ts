import { mock } from 'jest-mock-extended';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import type { N8nTool } from '@utils/N8nTool';

import { ToolHttpRequest } from '../ToolHttpRequest.node';

describe('ToolHttpRequest', () => {
	const httpTool = new ToolHttpRequest();
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const executeFunctions = mock<ISupplyDataFunctions>({ helpers });

	beforeEach(() => {
		jest.resetAllMocks();
		executeFunctions.getNode.mockReturnValue(
			mock<INode>({
				type: 'n8n-nodes-base.httpRequest',
				name: 'HTTP Request',
				typeVersion: 1.1,
			}),
		);
		executeFunctions.addInputData.mockReturnValue({ index: 0 });
	});

	describe('Binary response', () => {
		it('should return the error when receiving a binary response', async () => {
			helpers.httpRequest.mockResolvedValue({
				body: Buffer.from(''),
				headers: {
					'content-type': 'image/jpeg',
				},
			});

			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
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
			expect(helpers.httpRequest).toHaveBeenCalled();
			expect(res).toContain('error');
			expect(res).toContain('Binary data is not supported');
		});

		it('should return the response text when receiving a text response', async () => {
			helpers.httpRequest.mockResolvedValue({
				body: 'Hello World',
				headers: {
					'content-type': 'text/plain',
				},
			});

			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
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
			expect(helpers.httpRequest).toHaveBeenCalled();
			expect(res).toEqual('Hello World');
		});

		it('should return the response text when receiving a text response with a charset', async () => {
			helpers.httpRequest.mockResolvedValue({
				body: 'こんにちは世界',
				headers: {
					'content-type': 'text/plain; charset=iso-2022-jp',
				},
			});

			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
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
			expect(helpers.httpRequest).toHaveBeenCalled();
			expect(res).toEqual('こんにちは世界');
		});

		it('should return the response object when receiving a JSON response', async () => {
			const mockJson = { hello: 'world' };

			helpers.httpRequest.mockResolvedValue({
				body: JSON.stringify(mockJson),
				headers: {
					'content-type': 'application/json',
				},
			});

			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
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
			expect(helpers.httpRequest).toHaveBeenCalled();
			expect(jsonParse(res)).toEqual(mockJson);
		});

		it('should handle authentication with predefined credentials', async () => {
			helpers.httpRequestWithAuthentication.mockResolvedValue({
				body: 'Hello World',
				headers: {
					'content-type': 'text/plain',
				},
			});

			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
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

			expect(helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'linearApi',
				expect.objectContaining({
					returnFullResponse: true,
				}),
				undefined,
			);
		});

		it('should handle authentication with generic credentials', async () => {
			helpers.httpRequest.mockResolvedValue({
				body: 'Hello World',
				headers: {
					'content-type': 'text/plain',
				},
			});

			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
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

			executeFunctions.getCredentials.mockResolvedValue({
				user: 'username',
				password: 'password',
			});

			const { response } = await httpTool.supplyData.call(executeFunctions, 0);

			const res = await (response as N8nTool).invoke({});

			expect(res).toEqual('Hello World');

			expect(helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					returnFullResponse: true,
					auth: expect.objectContaining({
						username: 'username',
						password: 'password',
					}),
				}),
			);
		});

		it('should return the error when receiving text that contains a null character', async () => {
			helpers.httpRequest.mockResolvedValue({
				body: 'Hello\0World',
				headers: {
					'content-type': 'text/plain',
				},
			});

			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
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
			expect(helpers.httpRequest).toHaveBeenCalled();
			// Check that the returned string is formatted as an error message.
			expect(res).toContain('error');
			expect(res).toContain('Binary data is not supported');
		});

		it('should return the error when receiving a JSON response containing a null character', async () => {
			// Provide a raw JSON string with a literal null character.
			helpers.httpRequest.mockResolvedValue({
				body: '{"message":"hello\0world"}',
				headers: {
					'content-type': 'application/json',
				},
			});

			executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
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
			expect(helpers.httpRequest).toHaveBeenCalled();
			// Check that the tool returns an error string rather than resolving to valid JSON.
			expect(res).toContain('error');
			expect(res).toContain('Binary data is not supported');
		});
	});

	describe('Optimize response', () => {
		it('should extract body from the response HTML', async () => {
			helpers.httpRequest.mockResolvedValue({
				body: `<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
      <h1>Test</h1>

      <div>
        <p>
          Test content
        </p>
      </div>
  </body>
</html>`,
				headers: {
					'content-type': 'text/html',
				},
			});

			executeFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _: any, fallback: any) => {
					switch (paramName) {
						case 'method':
							return 'GET';
						case 'url':
							return '{url}';
						case 'options':
							return {};
						case 'placeholderDefinitions.values':
							return [];
						case 'optimizeResponse':
							return true;
						case 'responseType':
							return 'html';
						case 'cssSelector':
							return 'body';
						default:
							return fallback;
					}
				},
			);

			const { response } = await httpTool.supplyData.call(executeFunctions, 0);

			const res = await (response as N8nTool).invoke({
				url: 'https://httpbin.org/html',
			});

			expect(helpers.httpRequest).toHaveBeenCalled();
			expect(res).toEqual(
				JSON.stringify(['<h1>Test</h1> <div> <p> Test content </p> </div>'], null, 2),
			);
		});
	});
});
