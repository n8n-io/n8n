import { chatWithBuilder, getBuilderCredits } from './ai';
import * as apiUtils from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { ChatRequest } from '@/features/assistant/assistant.types';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import type { MockInstance } from 'vitest';

vi.mock('@n8n/rest-api-client');

describe('API: ai', () => {
	describe('chatWithBuilder', () => {
		let mockContext: IRestApiContext;
		let mockOnMessageUpdated: ReturnType<typeof vi.fn>;
		let mockOnDone: ReturnType<typeof vi.fn>;
		let mockOnError: ReturnType<typeof vi.fn>;
		let streamRequestSpy: MockInstance;

		beforeEach(() => {
			mockContext = {
				baseUrl: 'http://test-base-url',
				sessionId: 'test-session',
				pushRef: 'test-ref',
			} as IRestApiContext;

			mockOnMessageUpdated = vi.fn();
			mockOnDone = vi.fn();
			mockOnError = vi.fn();

			streamRequestSpy = vi
				.spyOn(apiUtils, 'streamRequest')
				.mockImplementation(async () => await Promise.resolve());
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should call streamRequest with the correct parameters', () => {
			const payload: ChatRequest.RequestPayload = {
				payload: {
					role: 'user',
					type: 'message',
					text: 'Build me a workflow',
				},
				sessionId: 'session-123',
			};

			chatWithBuilder(mockContext, payload, mockOnMessageUpdated, mockOnDone, mockOnError);

			expect(streamRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'/ai/build',
				{
					...payload,
					payload: {
						...payload.payload,
						useDeprecatedCredentials: false,
					},
				},
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				undefined,
				undefined,
			);
		});

		it('should pass abort signal when provided', () => {
			const payload: ChatRequest.RequestPayload = {
				payload: {
					role: 'user',
					type: 'message',
					text: 'Build me a workflow',
				},
			};

			const abortController = new AbortController();
			const abortSignal = abortController.signal;

			chatWithBuilder(
				mockContext,
				payload,
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				abortSignal,
			);

			expect(streamRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'/ai/build',
				{
					...payload,
					payload: {
						...payload.payload,
						useDeprecatedCredentials: false,
					},
				},
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				undefined,
				abortSignal,
			);
		});

		it('should use deprecated credentials when flag is true', () => {
			const payload: ChatRequest.RequestPayload = {
				payload: {
					role: 'user',
					type: 'message',
					text: 'Build me a workflow',
				},
				sessionId: 'session-456',
			};

			chatWithBuilder(
				mockContext,
				payload,
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				undefined,
				true,
			);

			expect(streamRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'/ai/build',
				{
					...payload,
					payload: {
						...payload.payload,
						useDeprecatedCredentials: true,
					},
				},
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				undefined,
				undefined,
			);
		});

		it('should handle InitSupportChat payload type', () => {
			const payload: ChatRequest.RequestPayload = {
				payload: {
					role: 'user',
					type: 'init-support-chat',
					user: {
						firstName: 'John',
					},
					question: 'How do I fix this error?',
					workflowContext: {
						currentWorkflow: {
							id: 'workflow-123',
							name: 'Test Workflow',
						},
					},
				},
			};

			chatWithBuilder(mockContext, payload, mockOnMessageUpdated, mockOnDone, mockOnError);

			expect(streamRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'/ai/build',
				{
					...payload,
					payload: {
						...payload.payload,
						useDeprecatedCredentials: false,
					},
				},
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				undefined,
				undefined,
			);
		});

		it('should handle EventRequestPayload type', () => {
			const payload: ChatRequest.RequestPayload = {
				payload: {
					role: 'user',
					type: 'event',
					eventName: 'node-execution-succeeded',
				},
				sessionId: 'session-789',
			};

			chatWithBuilder(mockContext, payload, mockOnMessageUpdated, mockOnDone, mockOnError);

			expect(streamRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'/ai/build',
				{
					...payload,
					payload: {
						...payload.payload,
						useDeprecatedCredentials: false,
					},
				},
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				undefined,
				undefined,
			);
		});

		it('should call callbacks correctly when streamRequest resolves', async () => {
			const responseData: ChatRequest.ResponsePayload = {
				sessionId: 'session-123',
				messages: [
					{
						role: 'assistant' as const,
						type: 'message' as const,
						text: 'I will help you build that workflow.',
					},
				],
			};

			streamRequestSpy.mockImplementation(
				async (
					_ctx: unknown,
					_url: unknown,
					_payload: unknown,
					onMessageUpdated: (data: ChatRequest.ResponsePayload) => void,
					onDone: () => void,
					_onError: unknown,
				) => {
					onMessageUpdated(responseData);
					onDone();
					return await Promise.resolve();
				},
			);

			const payload: ChatRequest.RequestPayload = {
				payload: {
					role: 'user',
					type: 'message',
					text: 'Build me a workflow',
				},
			};

			chatWithBuilder(mockContext, payload, mockOnMessageUpdated, mockOnDone, mockOnError);

			await vi.waitFor(() => {
				expect(mockOnMessageUpdated).toHaveBeenCalledWith(responseData);
				expect(mockOnDone).toHaveBeenCalled();
				expect(mockOnError).not.toHaveBeenCalled();
			});
		});

		it('should call onError when streamRequest rejects', async () => {
			const error = new Error('Stream request failed');

			streamRequestSpy.mockImplementation(
				async (
					_ctx: unknown,
					_url: unknown,
					_payload: unknown,
					_onMessageUpdated: unknown,
					_onDone: unknown,
					onError: (e: Error) => void,
				) => {
					onError(error);
					return await Promise.resolve();
				},
			);

			const payload: ChatRequest.RequestPayload = {
				payload: {
					role: 'user',
					type: 'message',
					text: 'Build me a workflow',
				},
			};

			chatWithBuilder(mockContext, payload, mockOnMessageUpdated, mockOnDone, mockOnError);

			await vi.waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith(error);
				expect(mockOnDone).not.toHaveBeenCalled();
			});
		});

		it('should handle complex workflow context in payload', () => {
			const payload: ChatRequest.RequestPayload = {
				payload: {
					role: 'user',
					type: 'message',
					text: 'Improve my workflow',
					workflowContext: {
						currentWorkflow: {
							id: 'workflow-123',
							name: 'Test Workflow',
							nodes: [],
							connections: {},
						},
						executionSchema: [
							{
								nodeName: 'HTTP Request',
								schema: {
									type: 'object',
									value: [],
									path: 'data',
									key: 'data',
								},
							},
						],
					},
				},
				sessionId: 'session-complex',
			};

			chatWithBuilder(
				mockContext,
				payload,
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				undefined,
				false,
			);

			expect(streamRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'/ai/build',
				{
					...payload,
					payload: {
						...payload.payload,
						useDeprecatedCredentials: false,
					},
				},
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				undefined,
				undefined,
			);
		});

		it('should handle undefined parameters correctly', () => {
			const payload: ChatRequest.RequestPayload = {
				payload: {
					role: 'user',
					type: 'message',
					text: 'Build me a workflow',
				},
			};

			chatWithBuilder(mockContext, payload, mockOnMessageUpdated, mockOnDone, mockOnError);

			expect(streamRequestSpy).toHaveBeenCalledWith(
				mockContext,
				'/ai/build',
				{
					...payload,
					payload: {
						...payload.payload,
						useDeprecatedCredentials: false,
					},
				},
				mockOnMessageUpdated,
				mockOnDone,
				mockOnError,
				undefined,
				undefined,
			);
		});
	});

	describe('getBuilderCredits', () => {
		let mockContext: IRestApiContext;
		let makeRestApiRequestSpy: MockInstance;

		beforeEach(() => {
			mockContext = {
				baseUrl: 'http://test-base-url',
				sessionId: 'test-session',
				pushRef: 'test-ref',
			} as IRestApiContext;

			makeRestApiRequestSpy = vi.spyOn(apiUtils, 'makeRestApiRequest');
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should call makeRestApiRequest with correct parameters and return credits data', async () => {
			const mockResponse = {
				creditsQuota: 1000,
				creditsClaimed: 500,
			};

			makeRestApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await getBuilderCredits(mockContext);

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(mockContext, 'GET', '/ai/build/credits');
			expect(result).toEqual(mockResponse);
		});

		it('should handle API errors', async () => {
			const error = new Error('API request failed');
			makeRestApiRequestSpy.mockRejectedValue(error);

			await expect(getBuilderCredits(mockContext)).rejects.toThrow('API request failed');
		});
	});
});
