/* eslint-disable @typescript-eslint/unbound-method */
import { testWebhookTriggerNode } from 'n8n-nodes-base/test/nodes/TriggerHelpers';
import { ApplicationError, NodeConnectionType } from 'n8n-workflow';

import { ChatTrigger } from '../ChatTrigger.node';

describe('ChatTrigger', () => {
	// Helper function to create mocked message JSON
	const mockedMessageJson = (content: string, type: string) => ({
		toJSON: () => ({ content, type }),
	});

	describe('webhook setup (GET request)', () => {
		it('should return 404 when not public', async () => {
			const { response } = await testWebhookTriggerNode(ChatTrigger, {
				webhookName: 'setup',
				node: {
					parameters: {
						public: false,
					},
				},
			});

			expect(response.status).toHaveBeenCalledWith(404);
		});

		it('should return chat page for public hosted mode', async () => {
			const { response } = await testWebhookTriggerNode(ChatTrigger, {
				webhookName: 'setup',
				node: {
					parameters: {
						public: true,
						mode: 'hostedChat',
						initialMessages: 'Hello\nHow can I help?',
						options: {
							title: 'Test Chat',
							subtitle: 'Test Subtitle',
							inputPlaceholder: 'Type here...',
						},
					},
				},
			});

			expect(response.status).toHaveBeenCalledWith(200);
			expect(response.send).toHaveBeenCalledWith(expect.stringContaining('Test Chat'));
			expect(response.send).toHaveBeenCalledWith(expect.stringContaining('Test Subtitle'));
			expect(response.send).toHaveBeenCalledWith(expect.stringContaining('Type here...'));
		});

		it('should not return chat page for webhook mode', async () => {
			const { response } = await testWebhookTriggerNode(ChatTrigger, {
				webhookName: 'setup',
				node: {
					parameters: {
						public: true,
						mode: 'webhook',
					},
				},
			});

			expect(response.send).not.toHaveBeenCalled();
		});
	});

	describe('webhook execution (POST request)', () => {
		it('should handle regular message', async () => {
			const { responseData } = await testWebhookTriggerNode(ChatTrigger, {
				node: {
					parameters: {
						public: true,
						mode: 'hostedChat',
					},
				},
				bodyData: {
					message: 'Test message',
				},
			});

			expect(responseData?.workflowData?.[0]).toEqual([{ json: { message: 'Test message' } }]);
		});

		it('should handle file uploads', async () => {
			const mockFile = {
				filepath: '/tmp/test.txt',
				originalFilename: 'test.txt',
				newFilename: 'test.txt',
				mimetype: 'text/plain',
			};

			const { responseData } = await testWebhookTriggerNode(ChatTrigger, {
				node: {
					parameters: {
						public: true,
						mode: 'hostedChat',
						options: {
							allowFileUploads: true,
						},
					},
				},
				request: {
					method: 'POST',
					contentType: 'multipart/form-data',
					body: {
						data: { message: 'Test with file' },
						files: {
							upload: mockFile,
						},
					},
				},
			});

			const returnData = responseData?.workflowData?.[0]?.[0];

			expect(returnData?.json?.files).toBeDefined();
			const returnDataFiles = returnData?.json?.files;
			expect(Array.isArray(returnDataFiles)).toBe(true);
			if (Array.isArray(returnDataFiles)) {
				expect(returnDataFiles.length).toBeGreaterThan(0);
			}
			expect(returnData?.binary).toBeDefined();
		});

		it('should load previous session from memory when requested', async () => {
			// Mock memory with chat history
			const mockMemory = {
				chatHistory: {
					getMessages: jest
						.fn()
						.mockResolvedValue([
							mockedMessageJson('My name is Nathan.', 'human'),
							mockedMessageJson('K.', 'ai'),
							mockedMessageJson('What is my name?', 'human'),
							mockedMessageJson('Nathan.', 'ai'),
						]),
				},
			};

			const node = {
				parameters: {
					public: true,
					mode: 'hostedChat',
					options: {
						loadPreviousSession: 'memory',
					},
				},
			};

			const { responseData } = await testWebhookTriggerNode(ChatTrigger, {
				node,
				bodyData: {
					action: 'loadPreviousSession',
				},
				childNodes: [
					{
						name: 'Memory',
						type: NodeConnectionType.AiMemory,
						typeVersion: 1,
					},
				],
				async getInputConnectionData(type) {
					if (type === NodeConnectionType.AiMemory) {
						return mockMemory;
					}
					return {};
				},
			});

			// Check if the previous session is loaded correctly
			expect(responseData?.webhookResponse?.data).toHaveLength(4);
			expect(responseData?.webhookResponse?.data[2]).toEqual({
				content: 'What is my name?',
				type: 'human',
			});
		});

		it('should return empty array when loadPreviousSession is notSupported', async () => {
			const { responseData } = await testWebhookTriggerNode(ChatTrigger, {
				node: {
					parameters: {
						public: true,
						mode: 'hostedChat',
						options: {
							loadPreviousSession: 'notSupported',
						},
					},
				},
				bodyData: {
					action: 'loadPreviousSession',
				},
			});

			expect(responseData?.webhookResponse?.data).toEqual([]);
		});

		it('should return empty array when loadPreviousSession throws but configured in params', async () => {
			// Mock memory with an error when getting messages
			const mockMemory = {
				chatHistory: {
					getMessages: jest.fn().mockResolvedValue([
						{
							toJSON: () => {
								throw new ApplicationError('Error when getting message');
							},
						},
					]),
				},
			};

			const node = {
				parameters: {
					public: true,
					mode: 'hostedChat',
					options: {
						loadPreviousSession: 'memory',
					},
				},
			};

			const errorLogger = jest.fn();
			const { responseData } = await testWebhookTriggerNode(ChatTrigger, {
				node,
				bodyData: {
					action: 'loadPreviousSession',
				},
				childNodes: [
					{
						name: 'Memory',
						type: NodeConnectionType.AiMemory,
						typeVersion: 1,
					},
				],
				async getInputConnectionData(type) {
					if (type === NodeConnectionType.AiMemory) {
						return mockMemory;
					}
					return {};
				},
				logger: {
					error: errorLogger,
				},
			});

			// Check if the response is empty and contains an error message
			expect(responseData?.webhookResponse?.data).toHaveLength(0);
			expect(errorLogger).toHaveBeenCalledWith(
				expect.stringContaining('Could not retrieve memory for loadPreviousSession'),
			);
		});
	});
});
