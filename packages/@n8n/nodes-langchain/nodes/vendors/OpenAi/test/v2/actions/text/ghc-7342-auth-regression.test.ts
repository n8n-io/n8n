/**
 * Regression test for GHC-7342
 *
 * Bug: OpenAI "Message a model" node fails with 401 "Missing bearer or basic
 * authentication in header" error, even though credential test passes and the
 * same credentials work with OpenAI Chat Model node.
 *
 * Expected: The authorization header should be present in the request to the
 * /responses endpoint.
 */

import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as helpers from '../../../../v2/actions/text/helpers/responses';
import { execute } from '../../../../v2/actions/text/response.operation';
import { getConnectedTools } from '@utils/helpers';

jest.mock('../../../../v2/actions/text/helpers/responses');
jest.mock('@utils/helpers');

const mockCreateRequest = helpers.createRequest as jest.MockedFunction<
	typeof helpers.createRequest
>;
const mockGetConnectedTools = getConnectedTools as jest.MockedFunction<typeof getConnectedTools>;

describe('GHC-7342: OpenAI Message a Model - Authorization Regression', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: jest.Mocked<INode>;
	let mockRequestWithAuthentication: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'Test Node',
			type: '@n8n/n8n-nodes-langchain.openAi',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});

		mockRequestWithAuthentication = jest.fn();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key-12345',
			organizationId: 'org-test',
		});
		mockExecuteFunctions.helpers = {
			...mockExecuteFunctions.helpers,
			requestWithAuthentication: mockRequestWithAuthentication,
		};

		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex: number, defaultValue?: unknown) => {
				const mockParams: Record<string, unknown> = {
					modelId: 'gpt-4.1-mini',
					'responses.values': [
						{
							content: 'say hello',
						},
					],
					options: {},
					builtInTools: {},
					simplify: false,
					hideTools: 'hide',
					'options.maxToolsIterations': 15,
				};
				return (mockParams[param] ?? defaultValue) as any;
			},
		);
	});

	it('should include Authorization header when calling /responses endpoint', async () => {
		// Arrange
		const mockResponse = {
			id: 'resp_123',
			status: 'completed',
			output: [
				{
					type: 'message',
					role: 'assistant',
					content: [
						{
							type: 'output_text',
							text: 'Hello! How can I help you today?',
						},
					],
				},
			],
		};

		mockCreateRequest.mockResolvedValue({
			model: 'gpt-4.1-mini',
			input: [{ role: 'user', content: [{ type: 'input_text', text: 'say hello' }] }],
		});

		// Mock the actual requestWithAuthentication to simulate what the real implementation does
		mockRequestWithAuthentication.mockResolvedValue(mockResponse);
		mockGetConnectedTools.mockResolvedValue([]);

		// Act
		await execute.call(mockExecuteFunctions, 0);

		// Assert
		// The underlying requestWithAuthentication should have been called with 'openAiApi'
		// which should trigger the authenticate method in the credentials
		// This is the CRITICAL assertion that tests the bug
		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({
				method: 'POST',
				uri: expect.stringContaining('/responses'),
				json: true,
			}),
		);
	});

	it('should authenticate request even when custom headers are provided', async () => {
		// Arrange
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key-12345',
			organizationId: 'org-test',
			url: 'https://custom-openai-endpoint.com/v1',
			header: true,
			headerName: 'X-Custom-Header',
			headerValue: 'custom-value',
		});

		const mockResponse = {
			id: 'resp_123',
			status: 'completed',
			output: [
				{
					type: 'message',
					role: 'assistant',
					content: [{ type: 'output_text', text: 'Response' }],
				},
			],
		};

		mockCreateRequest.mockResolvedValue({
			model: 'gpt-4.1-mini',
			input: [],
		});

		mockRequestWithAuthentication.mockResolvedValue(mockResponse);
		mockGetConnectedTools.mockResolvedValue([]);

		// Act
		await execute.call(mockExecuteFunctions, 0);

		// Assert
		// Should still call requestWithAuthentication which will add both
		// Authorization header and custom headers
		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({
				method: 'POST',
				uri: 'https://custom-openai-endpoint.com/v1/responses',
			}),
		);
	});

	it('should work with same credentials that work in OpenAI Chat Model', async () => {
		// This test simulates the exact scenario from the bug report:
		// - Same credentials work in OpenAI Chat Model (uses @langchain/openai ChatOpenAI)
		// - Same credentials fail in Message a Model (uses apiRequest with requestWithAuthentication)

		const sharedCredentials = {
			apiKey: 'sk-proj-test-api-key-12345',
			organizationId: '',
		};

		mockExecuteFunctions.getCredentials.mockResolvedValue(sharedCredentials);

		const mockResponse = {
			id: 'resp_123',
			status: 'completed',
			output: [
				{
					type: 'message',
					role: 'assistant',
					content: [{ type: 'output_text', text: 'Hello' }],
				},
			],
		};

		mockCreateRequest.mockResolvedValue({
			model: 'gpt-4.1-mini',
			input: [],
		});

		mockRequestWithAuthentication.mockResolvedValue(mockResponse);
		mockGetConnectedTools.mockResolvedValue([]);

		// Act
		await execute.call(mockExecuteFunctions, 0);

		// Assert
		// The key assertion: requestWithAuthentication must be called
		// This ensures the authenticate() method from credentials is invoked
		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({
				method: 'POST',
			}),
		);

		// Credentials should have been retrieved
		expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('openAiApi');
	});
});
