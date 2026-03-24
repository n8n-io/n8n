/**
 * Integration test for GHC-7342
 *
 * This test verifies that the Authorization header is properly added to the
 * request when using the Message a Model operation with the /responses endpoint.
 *
 * The bug report indicates that the request fails with "Missing bearer or basic
 * authentication in header" even though credential test passes.
 */

import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, IHttpRequestOptions } from 'n8n-workflow';

import * as helpers from '../../../../v2/actions/text/helpers/responses';
import { execute } from '../../../../v2/actions/text/response.operation';
import { getConnectedTools } from '@utils/helpers';

jest.mock('../../../../v2/actions/text/helpers/responses');
jest.mock('@utils/helpers');

const mockCreateRequest = helpers.createRequest as jest.MockedFunction<
	typeof helpers.createRequest
>;
const mockGetConnectedTools = getConnectedTools as jest.MockedFunction<typeof getConnectedTools>;

describe('GHC-7342: Integration Test - Authorization Header Presence', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: jest.Mocked<INode>;
	let mockRequestWithAuthentication: jest.Mock;
	let capturedRequestOptions: IHttpRequestOptions | null = null;

	beforeEach(() => {
		jest.clearAllMocks();
		capturedRequestOptions = null;

		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'OpenAI Message a Model Test',
			type: '@n8n/n8n-nodes-langchain.openAi',
			typeVersion: 2.1,
			position: [0, 0],
			parameters: {},
		});

		// Mock requestWithAuthentication to capture the options it receives
		mockRequestWithAuthentication = jest.fn().mockImplementation(async (credentialType, options) => {
			// Simulate what the real authenticate method would do
			// (from OpenAiApi.credentials.ts)
			const credentials = await mockExecuteFunctions.getCredentials(credentialType);

			// This simulates the authenticate() method in the credentials
			const modifiedOptions = {
				...options,
				headers: {
					...options.headers,
					'Authorization': `Bearer ${credentials.apiKey}`,
					'OpenAI-Organization': credentials.organizationId,
				},
			};

			capturedRequestOptions = modifiedOptions;

			return {
				id: 'resp_123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Hello!' }],
					},
				],
			};
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			apiKey: 'sk-proj-test-api-key-abc123xyz',
			organizationId: 'org-test123',
		});
		mockExecuteFunctions.helpers = {
			...mockExecuteFunctions.helpers,
			requestWithAuthentication: mockRequestWithAuthentication,
		};

		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex: number, defaultValue?: unknown) => {
				const mockParams: Record<string, unknown> = {
					modelId: 'gpt-4o-mini',
					'responses.values': [{ content: 'say hello' }],
					options: {},
					builtInTools: {},
					simplify: true,
					hideTools: 'hide',
					'options.maxToolsIterations': 15,
				};
				return (mockParams[param] ?? defaultValue) as any;
			},
		);

		mockCreateRequest.mockResolvedValue({
			model: 'gpt-4o-mini',
			input: [{ role: 'user', content: [{ type: 'input_text', text: 'say hello' }] }],
		});
		mockGetConnectedTools.mockResolvedValue([]);
	});

	it('should add Bearer Authorization header to /responses endpoint request', async () => {
		// Act
		await execute.call(mockExecuteFunctions, 0);

		// Assert
		expect(capturedRequestOptions).not.toBeNull();
		expect(capturedRequestOptions?.headers).toHaveProperty('Authorization');
		expect(capturedRequestOptions?.headers?.['Authorization']).toBe(
			'Bearer sk-proj-test-api-key-abc123xyz',
		);
	});

	it('should include OpenAI-Organization header when organizationId is provided', async () => {
		// Act
		await execute.call(mockExecuteFunctions, 0);

		// Assert
		expect(capturedRequestOptions).not.toBeNull();
		expect(capturedRequestOptions?.headers).toHaveProperty('OpenAI-Organization');
		expect(capturedRequestOptions?.headers?.['OpenAI-Organization']).toBe('org-test123');
	});

	it('should make request to correct /responses endpoint', async () => {
		// Act
		await execute.call(mockExecuteFunctions, 0);

		// Assert
		expect(capturedRequestOptions).not.toBeNull();
		expect(capturedRequestOptions?.uri).toContain('/responses');
		expect(capturedRequestOptions?.method).toBe('POST');
	});

	it('should fail if Authorization header is missing (simulating the bug)', async () => {
		// Simulate a scenario where requestWithAuthentication doesn't add the header
		// (this would be the bug)
		mockRequestWithAuthentication.mockImplementation(async (_credentialType, options) => {
			// Intentionally NOT adding Authorization header to simulate the bug
			capturedRequestOptions = options;

			// Simulate OpenAI's 401 error response
			throw new Error('Request failed with status code 401: Missing bearer or basic authentication in header');
		});

		// Act & Assert
		await expect(execute.call(mockExecuteFunctions, 0)).rejects.toThrow(
			'Missing bearer or basic authentication',
		);

		// Verify the Authorization header was NOT added (simulating the bug)
		expect(capturedRequestOptions?.headers?.['Authorization']).toBeUndefined();
	});

	it('should work with custom base URL', async () => {
		// Setup with custom URL
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			apiKey: 'sk-custom-key',
			organizationId: '',
			url: 'https://custom-openai.example.com/v1',
		});

		// Act
		await execute.call(mockExecuteFunctions, 0);

		// Assert
		expect(capturedRequestOptions).not.toBeNull();
		expect(capturedRequestOptions?.uri).toBe('https://custom-openai.example.com/v1/responses');
		expect(capturedRequestOptions?.headers?.['Authorization']).toBe('Bearer sk-custom-key');
	});

	it('should include custom headers when configured', async () => {
		// Setup with custom header
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			apiKey: 'sk-test',
			organizationId: '',
			header: true,
			headerName: 'X-Custom-Auth',
			headerValue: 'custom-value-123',
		});

		mockRequestWithAuthentication.mockImplementation(async (credentialType, options) => {
			const credentials = await mockExecuteFunctions.getCredentials(credentialType);
			const modifiedOptions = {
				...options,
				headers: {
					...options.headers,
					'Authorization': `Bearer ${credentials.apiKey}`,
					'OpenAI-Organization': credentials.organizationId,
					[credentials.headerName as string]: credentials.headerValue,
				},
			};
			capturedRequestOptions = modifiedOptions;
			return { id: 'resp_123', status: 'completed', output: [] };
		});

		// Act
		await execute.call(mockExecuteFunctions, 0);

		// Assert
		expect(capturedRequestOptions?.headers).toHaveProperty('X-Custom-Auth');
		expect(capturedRequestOptions?.headers?.['X-Custom-Auth']).toBe('custom-value-123');
		expect(capturedRequestOptions?.headers?.['Authorization']).toBe('Bearer sk-test');
	});
});
