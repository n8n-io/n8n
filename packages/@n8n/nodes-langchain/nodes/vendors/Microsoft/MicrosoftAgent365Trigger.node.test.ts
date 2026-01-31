import type { INodeType, IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';
import { MicrosoftAgent365Trigger } from './MicrosoftAgent365Trigger.node';
import {
	createMicrosoftAgentApplication,
	configureAdapterProcessCallback,
	type MicrosoftAgent365Credentials,
	type ActivityCapture,
} from './microsoft-utils';

// Mock the dependencies
jest.mock('./microsoft-utils', () => ({
	createMicrosoftAgentApplication: jest.fn(),
	configureAdapterProcessCallback: jest.fn(),
	microsoftMcpServers: [
		{ name: 'Calendar', value: 'mcp_CalendarTools' },
		{ name: 'Mail', value: 'mcp_MailTools' },
	],
}));

jest.mock('../../agents/Agent/V2/utils', () => ({
	getInputs: jest.fn(),
}));

describe('MicrosoftAgent365Trigger', () => {
	let microsoftAgent365Trigger: INodeType;
	let mockWebhookFunctions: IWebhookFunctions;
	let mockRequest: any;
	let mockResponse: any;
	let mockAdapter: any;

	beforeEach(() => {
		microsoftAgent365Trigger = new MicrosoftAgent365Trigger();

		// Create mock request
		mockRequest = {
			method: 'POST',
			body: {},
			headers: {},
		};

		// Create mock response
		mockResponse = {
			end: jest.fn(),
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		};

		// Create mock adapter
		mockAdapter = {
			process: jest.fn().mockResolvedValue(undefined),
		};

		// Create mock webhook functions using jest-mock-extended
		mockWebhookFunctions = mock<IWebhookFunctions>();
		mockWebhookFunctions.getRequestObject = jest.fn().mockReturnValue(mockRequest);
		mockWebhookFunctions.getResponseObject = jest.fn().mockReturnValue(mockResponse);
		mockWebhookFunctions.getCredentials = jest.fn() as any;
		mockWebhookFunctions.getNode = jest.fn().mockReturnValue({
			name: 'Microsoft Agent 365',
			type: 'microsoftAgent365Trigger',
		});
		mockWebhookFunctions.helpers = {
			returnJsonArray: jest.fn((data) => {
				if (Array.isArray(data)) {
					return data.map((item) => ({ json: item }));
				}
				return [{ json: data }];
			}),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('Node Description', () => {
		test('should have correct basic properties', () => {
			expect(microsoftAgent365Trigger.description.displayName).toBe('Microsoft Agent 365 Trigger');
			expect(microsoftAgent365Trigger.description.name).toBe('microsoftAgent365Trigger');
			expect(microsoftAgent365Trigger.description.group).toEqual(['trigger']);
		});

		test('should have webhook configuration', () => {
			expect(microsoftAgent365Trigger.description.webhooks).toBeDefined();
			expect(microsoftAgent365Trigger.description.webhooks).toHaveLength(2);

			// Check POST webhook
			const postWebhook = microsoftAgent365Trigger.description.webhooks![0];
			expect(postWebhook.httpMethod).toBe('POST');
			expect(postWebhook.path).toBe('webhook');
			expect(postWebhook.responseMode).toBe('onReceived');

			// Check HEAD webhook
			const headWebhook = microsoftAgent365Trigger.description.webhooks![1];
			expect(headWebhook.httpMethod).toBe('HEAD');
			expect(headWebhook.path).toBe('webhook');
		});

		test('should require microsoftAgent365Api credentials', () => {
			expect(microsoftAgent365Trigger.description.credentials).toBeDefined();
			expect(microsoftAgent365Trigger.description.credentials).toHaveLength(1);
			expect(microsoftAgent365Trigger.description.credentials![0].name).toBe(
				'microsoftAgent365Api',
			);
			expect(microsoftAgent365Trigger.description.credentials![0].required).toBe(true);
		});

		test('should have system prompt property', () => {
			const properties = microsoftAgent365Trigger.description.properties;
			const systemPromptProp = properties.find((p) => p.name === 'systemPrompt');

			expect(systemPromptProp).toBeDefined();
			expect(systemPromptProp?.type).toBe('string');
			expect(systemPromptProp?.displayName).toBe('System Prompt');
		});
	});

	describe('webhook method', () => {
		describe('HEAD request handling', () => {
			test('should handle HEAD request and return immediately', async () => {
				mockRequest.method = 'HEAD';

				const result = await microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions);

				expect(mockResponse.end).toHaveBeenCalled();
				expect(result).toEqual({
					noWebhookResponse: true,
				});
				expect(mockWebhookFunctions.getCredentials).not.toHaveBeenCalled();
			});
		});

		describe('POST request handling', () => {
			let mockCredentials: MicrosoftAgent365Credentials;
			let mockAgent: any;

			beforeEach(() => {
				mockCredentials = {
					clientId: 'test-client-id',
					tenantId: 'test-tenant-id',
					clientSecret: 'test-client-secret',
				};

				mockAgent = {
					adapter: mockAdapter,
				};

				(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
				(createMicrosoftAgentApplication as jest.Mock).mockReturnValue(mockAgent);
			});

			test('should process POST request successfully', async () => {
				const mockCallback = jest.fn();
				(configureAdapterProcessCallback as jest.Mock).mockReturnValue(mockCallback);

				const result = await microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions);

				// Verify credentials were retrieved
				expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('microsoftAgent365Api');

				// Verify agent application was created
				expect(createMicrosoftAgentApplication).toHaveBeenCalledWith(mockCredentials);

				// Verify callback was configured
				expect(configureAdapterProcessCallback).toHaveBeenCalledWith(
					mockWebhookFunctions,
					mockAgent,
					mockCredentials,
					expect.objectContaining({
						input: '',
						output: [],
						activity: {},
					}),
				);

				// Verify request user was set
				expect(mockRequest.user).toEqual({
					aud: mockCredentials.clientId,
					appid: mockCredentials.clientId,
					azp: mockCredentials.clientId,
				});

				// Verify adapter process was called
				expect(mockAdapter.process).toHaveBeenCalledWith(mockRequest, mockResponse, mockCallback);

				// Verify result structure
				expect(result).toEqual({
					noWebhookResponse: true,
					workflowData: expect.any(Array),
				});
			});

			test('should capture activity data in workflowData', async () => {
				const mockCallback = jest.fn();
				(configureAdapterProcessCallback as jest.Mock).mockReturnValue(mockCallback);

				const result = (await microsoftAgent365Trigger.webhook!.call(
					mockWebhookFunctions,
				)) as IWebhookResponseData;

				expect(result.workflowData).toBeDefined();
				expect(Array.isArray(result.workflowData)).toBe(true);
				expect(result.workflowData).toHaveLength(1);

				// Verify returnJsonArray was called with activity capture
				expect(mockWebhookFunctions.helpers!.returnJsonArray).toHaveBeenCalledWith(
					expect.objectContaining({
						input: '',
						output: [],
						activity: {},
					}),
				);
			});

			test('should set request user properties correctly', async () => {
				const mockCallback = jest.fn();
				(configureAdapterProcessCallback as jest.Mock).mockReturnValue(mockCallback);

				await microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions);

				expect(mockRequest.user).toBeDefined();
				expect(mockRequest.user.aud).toBe(mockCredentials.clientId);
				expect(mockRequest.user.appid).toBe(mockCredentials.clientId);
				expect(mockRequest.user.azp).toBe(mockCredentials.clientId);
			});
		});

		describe('Error handling', () => {
			test('should throw NodeOperationError when credentials retrieval fails', async () => {
				const error = new Error('Credentials not found');
				(mockWebhookFunctions.getCredentials as jest.Mock).mockRejectedValue(error);

				await expect(microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			});

			test('should handle error with response data containing error object', async () => {
				const errorResponse = {
					response: {
						data: {
							error: 'invalid_client',
							error_description: 'Invalid client credentials',
						},
					},
				};

				(mockWebhookFunctions.getCredentials as jest.Mock).mockRejectedValue(errorResponse);

				await expect(microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions)).rejects.toThrow(
					'Error: invalid_client',
				);
			});

			test('should include error description in NodeOperationError', async () => {
				const errorResponse = {
					response: {
						data: {
							error: 'unauthorized',
							error_description: 'The provided credentials are invalid',
						},
					},
					message: 'Authentication failed',
				};

				(mockWebhookFunctions.getCredentials as jest.Mock).mockRejectedValue(errorResponse);

				try {
					await microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions);
					fail('Should have thrown an error');
				} catch (error) {
					expect(error).toBeInstanceOf(NodeOperationError);
					expect((error as NodeOperationError).description).toBe(
						'The provided credentials are invalid',
					);
				}
			});

			test('should throw NodeOperationError with message when no error object in response', async () => {
				const error = new Error('Network error');
				(mockWebhookFunctions.getCredentials as jest.Mock).mockRejectedValue(error);

				try {
					await microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions);
					fail('Should have thrown an error');
				} catch (err) {
					expect(err).toBeInstanceOf(NodeOperationError);
					expect((err as NodeOperationError).message).toContain('Network error');
				}
			});

			test('should throw NodeOperationError when agent creation fails', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					tenantId: 'test-tenant-id',
					clientSecret: 'test-client-secret',
				};

				(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
				(createMicrosoftAgentApplication as jest.Mock).mockImplementation(() => {
					throw new Error('Failed to create agent application');
				});

				await expect(microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			});

			test('should throw NodeOperationError when adapter process fails', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					tenantId: 'test-tenant-id',
					clientSecret: 'test-client-secret',
				};

				const mockAgent = {
					adapter: {
						process: jest.fn().mockRejectedValue(new Error('Adapter processing failed')),
					},
				};

				(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
				(createMicrosoftAgentApplication as jest.Mock).mockReturnValue(mockAgent);

				await expect(microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			});
		});

		describe('Integration scenarios', () => {
			test('should handle complete webhook flow with activity capture', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					tenantId: 'test-tenant-id',
					clientSecret: 'test-client-secret',
				};

				const mockAgent = {
					adapter: mockAdapter,
				};

				let capturedActivityCapture: ActivityCapture | undefined;
				const mockCallback = jest.fn();

				(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
				(createMicrosoftAgentApplication as jest.Mock).mockReturnValue(mockAgent);
				(configureAdapterProcessCallback as jest.Mock).mockImplementation(
					(_ctx, _agent, _creds, activityCapture) => {
						capturedActivityCapture = activityCapture;
						return mockCallback;
					},
				);

				const result = await microsoftAgent365Trigger.webhook!.call(mockWebhookFunctions);

				// Verify activity capture was initialized
				expect(capturedActivityCapture).toBeDefined();
				expect(capturedActivityCapture?.input).toBe('');
				expect(capturedActivityCapture?.output).toEqual([]);
				expect(capturedActivityCapture?.activity).toEqual({});

				// Verify the full flow completed
				expect(createMicrosoftAgentApplication).toHaveBeenCalled();
				expect(configureAdapterProcessCallback).toHaveBeenCalled();
				expect(mockAdapter.process).toHaveBeenCalled();
				expect(result.noWebhookResponse).toBe(true);
				expect(result.workflowData).toBeDefined();
			});
		});
	});
});
