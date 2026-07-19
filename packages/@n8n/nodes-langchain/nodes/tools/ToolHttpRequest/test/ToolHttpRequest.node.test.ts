import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { N8nTool } from '@utils/N8nTool';

import { ToolHttpRequest } from '../ToolHttpRequest.node';

describe('ToolHttpRequest', () => {
	const httpTool = new ToolHttpRequest();
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const executeFunctions = mock<ISupplyDataFunctions>({ helpers });

	beforeEach(() => {
		vi.resetAllMocks();
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

	describe('Error responses', () => {
		beforeEach(() => {
			executeFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _: any, fallback: any) => {
					switch (paramName) {
						case 'method':
							return 'GET';
						case 'url':
							return 'https://httpbin.org/status';
						case 'options':
							return {};
						case 'placeholderDefinitions.values':
							return [];
						default:
							return fallback;
					}
				},
			);
		});

		const invokeTool = async () => {
			const { response } = await httpTool.supplyData.call(executeFunctions, 0);
			return await (response as N8nTool).invoke({});
		};

		it('should include the response body when the request fails with a 4xx', async () => {
			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Request failed with status code 403'), {
					response: {
						status: 403,
						data: { error: 'insufficient_scope', required: 'read:users' },
					},
				}),
			);

			const res = await invokeTool();

			expect(res).toContain('HTTP 403');
			expect(res).toContain('insufficient_scope');
			expect(res).toContain('read:users');
		});

		it('should include the response body when the request fails with a 5xx', async () => {
			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Request failed with status code 503'), {
					response: { status: 503, data: 'Upstream database is unavailable' },
				}),
			);

			const res = await invokeTool();

			expect(res).toContain('HTTP 503');
			expect(res).toContain('Upstream database is unavailable');
		});

		it('should read the response body from the cause when the error is wrapped', async () => {
			const cause = Object.assign(new Error('Request failed with status code 422'), {
				response: { status: 422, data: { message: 'The "email" field is required' } },
			});

			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Unprocessable Entity'), { httpCode: '422', cause }),
			);

			const res = await invokeTool();

			expect(res).toContain('HTTP 422');
			expect(res).toContain('email');
			expect(res).toContain('field is required');
		});

		it('should report the error alone when the request failed without a response', async () => {
			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), { code: 'ECONNREFUSED' }),
			);

			const res = await invokeTool();

			expect(res).toContain('There was an error');
			expect(res).toContain('ECONNREFUSED');
			expect(res).not.toContain('Response body');
		});

		it('should not add a response body section when the error response is empty', async () => {
			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Request failed with status code 404'), {
					response: { status: 404, data: '' },
				}),
			);

			const res = await invokeTool();

			expect(res).toContain('HTTP 404');
			expect(res).not.toContain('Response body');
		});

		it('should read the response body reported by the legacy request helper', async () => {
			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Forbidden'), {
					statusCode: 403,
					error: { error: 'insufficient_scope' },
					response: { status: 403, headers: {}, statusText: 'Forbidden' },
				}),
			);

			const res = await invokeTool();

			expect(res).toContain('HTTP 403');
			expect(res).toContain('insufficient_scope');
		});

		it('should derive the status code from the wrapped error when the wrapper has none', async () => {
			const cause = Object.assign(new Error('Request failed with status code 429'), {
				response: { status: 429, data: 'Rate limit exceeded' },
			});

			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Too Many Requests'), { httpCode: null, cause }),
			);

			const res = await invokeTool();

			expect(res).toContain('HTTP 429');
			expect(res).toContain('Rate limit exceeded');
		});

		it('should truncate an oversized error body', async () => {
			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Internal Server Error'), {
					response: { status: 500, data: 'x'.repeat(5000) },
				}),
			);

			const res = await invokeTool();

			expect(res).toContain('[truncated]');
			expect(res.length).toBeLessThan(3000);
		});

		it('should skip a binary error body', async () => {
			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Internal Server Error'), {
					response: { status: 500, data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
				}),
			);

			const res = await invokeTool();

			expect(res).toContain('HTTP 500');
			expect(res).not.toContain('Response body');
		});

		it('should not throw when the error body cannot be serialized', async () => {
			const circular: Record<string, unknown> = { message: 'Bad Request' };
			circular.self = circular;

			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Bad Request'), {
					response: { status: 400, data: circular },
				}),
			);

			const res = await invokeTool();

			expect(res).toContain('HTTP 400');
			expect(res).not.toContain('Response body');
		});

		it('should not repeat the body when it is already part of the error message', async () => {
			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('403 - forbidden by policy'), {
					response: { status: 403, data: 'forbidden by policy' },
				}),
			);

			const res = await invokeTool();

			expect(res).toContain('forbidden by policy');
			expect(res).not.toContain('Response body');
		});

		it('should redact credential values echoed back in the error body', async () => {
			helpers.httpRequest.mockRejectedValue(
				Object.assign(new Error('Unauthorized'), {
					response: {
						status: 401,
						data: {
							message: 'Rejected request',
							api_key: 'sk-live-abcdef123456',
							authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9',
						},
					},
				}),
			);

			const res = await invokeTool();

			expect(res).toContain('HTTP 401');
			// The key stays so the model still learns which credential was rejected.
			expect(res).toContain('api_key');
			expect(res).toContain('Rejected request');
			expect(res).not.toContain('sk-live-abcdef123456');
			expect(res).not.toContain('eyJhbGciOiJIUzI1NiJ9');
		});

		it('should leave successful responses untouched', async () => {
			helpers.httpRequest.mockResolvedValue({
				body: 'Hello World',
				statusCode: 200,
				headers: { 'content-type': 'text/plain' },
			});

			const res = await invokeTool();

			expect(res).toEqual('Hello World');
		});
	});
});
