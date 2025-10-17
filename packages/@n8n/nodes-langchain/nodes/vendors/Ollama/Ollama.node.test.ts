import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { z } from 'zod';

import * as helpers from '@utils/helpers';

import * as image from './actions/image';
import * as text from './actions/text';
import * as transport from './transport';
import type { OllamaChatResponse, OllamaMessage } from './helpers/interfaces';

describe('Ollama Node', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const apiRequestMock = jest.spyOn(transport, 'apiRequest');
	const getConnectedToolsMock = jest.spyOn(helpers, 'getConnectedTools');

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('Text -> Message', () => {
		it('should call the API with correct parameters for basic message', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llama3.2:latest';
					case 'messages.values':
						return [{ role: 'user', content: 'Hello, world!' }];
					case 'simplify':
						return true;
					case 'options':
						return {
							system: 'You are a helpful assistant.',
							temperature: 0.7,
							top_p: 0.9,
							top_k: 40,
							num_predict: 1024,
						};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }]);
			getConnectedToolsMock.mockResolvedValue([]);
			apiRequestMock.mockResolvedValue({
				model: 'llama3.2:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: { role: 'assistant', content: 'Hello! How can I help you today?' },
				done: true,
			} as OllamaChatResponse);

			const result = await text.message.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: { content: 'Hello! How can I help you today?' },
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/api/chat', {
				body: {
					model: 'llama3.2:latest',
					messages: [
						{ role: 'system', content: 'You are a helpful assistant.' },
						{ role: 'user', content: 'Hello, world!' },
					],
					stream: false,
					tools: [],
					options: {
						temperature: 0.7,
						top_p: 0.9,
						top_k: 40,
						num_predict: 1024,
					},
				},
			});
		});

		it('should return full response when simplify is false', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llama3.2:latest';
					case 'messages.values':
						return [{ role: 'user', content: 'Test message' }];
					case 'simplify':
						return false;
					case 'options':
						return {};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }]);
			getConnectedToolsMock.mockResolvedValue([]);
			const mockResponse = {
				model: 'llama3.2:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: { role: 'assistant', content: 'Test response' },
				done: true,
				total_duration: 5000000,
				load_duration: 1000000,
				eval_count: 10,
				eval_duration: 2000000,
			} as OllamaChatResponse;
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await text.message.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle tool calls correctly', async () => {
			const mockTool = {
				name: 'calculator',
				description: 'Performs calculations',
				schema: z.object({
					expression: z.string().describe('Mathematical expression to evaluate'),
				}),
				invoke: jest.fn().mockResolvedValue({ result: 42 }),
			};

			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llama3.2:latest';
					case 'messages.values':
						return [{ role: 'user', content: 'What is 6 * 7?' }];
					case 'simplify':
						return true;
					case 'options':
						return {};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }, { type: 'ai_tool' }]);
			// @ts-expect-error: Mocking a tool, we do not implement the full interface
			getConnectedToolsMock.mockResolvedValue([mockTool]);

			apiRequestMock.mockResolvedValueOnce({
				model: 'llama3.2:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: {
					role: 'assistant',
					content: '',
					tool_calls: [
						{
							function: {
								name: 'calculator',
								arguments: { expression: '6 * 7' },
							},
						},
					],
				},
				done: true,
			} as OllamaChatResponse);

			apiRequestMock.mockResolvedValueOnce({
				model: 'llama3.2:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: { role: 'assistant', content: 'The result is 42.' },
				done: true,
			} as OllamaChatResponse);

			const result = await text.message.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: { content: 'The result is 42.' },
					pairedItem: { item: 0 },
				},
			]);
			expect(mockTool.invoke).toHaveBeenCalledWith({ expression: '6 * 7' });
			expect(apiRequestMock).toHaveBeenCalledTimes(2);
		});

		it('should handle tool execution errors gracefully', async () => {
			const mockTool = {
				name: 'failing_tool',
				description: 'A tool that fails',
				schema: z.object({}),
				invoke: jest.fn().mockRejectedValue(new Error('Tool execution failed')),
			};

			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llama3.2:latest';
					case 'messages.values':
						return [{ role: 'user', content: 'Use the failing tool' }];
					case 'simplify':
						return true;
					case 'options':
						return {};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }, { type: 'ai_tool' }]);
			// @ts-expect-error: Mocking a tool, we do not implement the full interface
			getConnectedToolsMock.mockResolvedValue([mockTool]);

			apiRequestMock.mockResolvedValueOnce({
				model: 'llama3.2:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: {
					role: 'assistant',
					content: '',
					tool_calls: [
						{
							function: {
								name: 'failing_tool',
								arguments: {},
							},
						},
					],
				},
				done: true,
			} as OllamaChatResponse);

			apiRequestMock.mockResolvedValueOnce({
				model: 'llama3.2:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: { role: 'assistant', content: 'I encountered an error with the tool.' },
				done: true,
			} as OllamaChatResponse);

			const result = await text.message.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: { content: 'I encountered an error with the tool.' },
					pairedItem: { item: 0 },
				},
			]);

			const secondCallBody = apiRequestMock.mock.calls[1][2]?.body as any;
			const toolMessage = secondCallBody.messages.find((msg: OllamaMessage) => msg.role === 'tool');
			expect(toolMessage.content).toBe('Error executing tool: Tool execution failed');
		});

		it('should process stop sequences correctly', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llama3.2:latest';
					case 'messages.values':
						return [{ role: 'user', content: 'Generate text' }];
					case 'simplify':
						return true;
					case 'options':
						return {
							stop: '###,END,STOP',
						};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }]);
			getConnectedToolsMock.mockResolvedValue([]);
			apiRequestMock.mockResolvedValue({
				model: 'llama3.2:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: { role: 'assistant', content: 'Generated text' },
				done: true,
			} as OllamaChatResponse);

			await text.message.execute.call(executeFunctionsMock, 0);

			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/api/chat', {
				body: {
					model: 'llama3.2:latest',
					messages: [{ role: 'user', content: 'Generate text' }],
					stream: false,
					tools: [],
					options: {
						stop: ['###', 'END', 'STOP'],
					},
				},
			});
		});

		it('should handle various model-specific options', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llama3.2:latest';
					case 'messages.values':
						return [{ role: 'user', content: 'Test with options' }];
					case 'simplify':
						return true;
					case 'options':
						return {
							temperature: 0.5,
							top_p: 0.8,
							top_k: 30,
							num_predict: 512,
							frequency_penalty: 0.1,
							presence_penalty: 0.2,
							repeat_penalty: 1.2,
							num_ctx: 2048,
							repeat_last_n: 32,
							min_p: 0.1,
							seed: 123,
							low_vram: true,
							main_gpu: 1,
							num_batch: 256,
							num_gpu: 2,
							num_thread: 8,
							penalize_newline: false,
							use_mlock: true,
							use_mmap: false,
							vocab_only: false,
							keep_alive: '10m',
							format: 'json',
						};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }]);
			getConnectedToolsMock.mockResolvedValue([]);
			apiRequestMock.mockResolvedValue({
				model: 'llama3.2:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: { role: 'assistant', content: '{"response": "test"}' },
				done: true,
			} as OllamaChatResponse);

			await text.message.execute.call(executeFunctionsMock, 0);

			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/api/chat', {
				body: {
					model: 'llama3.2:latest',
					messages: [{ role: 'user', content: 'Test with options' }],
					stream: false,
					tools: [],
					options: {
						temperature: 0.5,
						top_p: 0.8,
						top_k: 30,
						num_predict: 512,
						frequency_penalty: 0.1,
						presence_penalty: 0.2,
						repeat_penalty: 1.2,
						num_ctx: 2048,
						repeat_last_n: 32,
						min_p: 0.1,
						seed: 123,
						low_vram: true,
						main_gpu: 1,
						num_batch: 256,
						num_gpu: 2,
						num_thread: 8,
						penalize_newline: false,
						use_mlock: true,
						use_mmap: false,
						vocab_only: false,
						keep_alive: '10m',
						format: 'json',
					},
				},
			});
		});
	});

	describe('Image -> Analyze', () => {
		it('should analyze image from binary data', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llava:latest';
					case 'inputType':
						return 'binary';
					case 'binaryPropertyName':
						return 'data';
					case 'text':
						return "What's in this image?";
					case 'simplify':
						return true;
					case 'options':
						return {
							temperature: 0.3,
							num_predict: 512,
						};
					default:
						return undefined;
				}
			});

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(
				Buffer.from('test image data'),
			);
			apiRequestMock.mockResolvedValue({
				model: 'llava:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: {
					role: 'assistant',
					content: 'This image shows a beautiful mountain landscape with snow-capped peaks.',
				},
				done: true,
			} as OllamaChatResponse);

			const result = await image.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: 'This image shows a beautiful mountain landscape with snow-capped peaks.',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/api/chat', {
				body: {
					model: 'llava:latest',
					messages: [
						{
							role: 'user',
							content: "What's in this image?",
							images: ['dGVzdCBpbWFnZSBkYXRh'], // base64 encoded 'test image data'
						},
					],
					stream: false,
					options: {
						temperature: 0.3,
						num_predict: 512,
					},
				},
			});
		});

		it('should analyze image from URL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llava:latest';
					case 'inputType':
						return 'url';
					case 'imageUrls':
						return 'https://example.com/test-image.jpg';
					case 'text':
						return 'Describe this image';
					case 'simplify':
						return true;
					case 'options':
						return {};
					default:
						return undefined;
				}
			});

			executeFunctionsMock.helpers.httpRequest.mockResolvedValue(
				Buffer.from('downloaded image data'),
			);
			apiRequestMock.mockResolvedValue({
				model: 'llava:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: {
					role: 'assistant',
					content: 'This image contains a sunset over the ocean.',
				},
				done: true,
			} as OllamaChatResponse);

			const result = await image.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: { content: 'This image contains a sunset over the ocean.' },
					pairedItem: { item: 0 },
				},
			]);
			expect(executeFunctionsMock.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://example.com/test-image.jpg',
				encoding: 'arraybuffer',
			});
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/api/chat', {
				body: {
					model: 'llava:latest',
					messages: [
						{
							role: 'user',
							content: 'Describe this image',
							images: ['ZG93bmxvYWRlZCBpbWFnZSBkYXRh'], // base64 encoded 'downloaded image data'
						},
					],
					stream: false,
					options: {},
				},
			});
		});

		it('should handle multiple images from URLs', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llava:latest';
					case 'inputType':
						return 'url';
					case 'imageUrls':
						return 'https://example.com/image1.jpg, https://example.com/image2.png';
					case 'text':
						return 'Compare these images';
					case 'simplify':
						return true;
					case 'options':
						return {};
					default:
						return undefined;
				}
			});

			executeFunctionsMock.helpers.httpRequest.mockResolvedValueOnce(
				Buffer.from('first image data'),
			);
			executeFunctionsMock.helpers.httpRequest.mockResolvedValueOnce(
				Buffer.from('second image data'),
			);
			apiRequestMock.mockResolvedValue({
				model: 'llava:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: {
					role: 'assistant',
					content: 'Both images show different landscapes.',
				},
				done: true,
			} as OllamaChatResponse);

			const result = await image.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: { content: 'Both images show different landscapes.' },
					pairedItem: { item: 0 },
				},
			]);
			expect(executeFunctionsMock.helpers.httpRequest).toHaveBeenCalledTimes(2);
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/api/chat', {
				body: {
					model: 'llava:latest',
					messages: [
						{
							role: 'user',
							content: 'Compare these images',
							images: [
								'Zmlyc3QgaW1hZ2UgZGF0YQ==', // base64 encoded 'first image data'
								'c2Vjb25kIGltYWdlIGRhdGE=', // base64 encoded 'second image data'
							],
						},
					],
					stream: false,
					options: {},
				},
			});
		});

		it('should handle multiple binary images', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llava:latest';
					case 'inputType':
						return 'binary';
					case 'binaryPropertyName':
						return 'image1,image2';
					case 'text':
						return 'Analyze these images';
					case 'simplify':
						return false;
					case 'options':
						return {};
					default:
						return undefined;
				}
			});

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValueOnce(
				Buffer.from('first binary image'),
			);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValueOnce(
				Buffer.from('second binary image'),
			);
			const mockResponse = {
				model: 'llava:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: {
					role: 'assistant',
					content: 'Analysis complete for both images.',
				},
				done: true,
				eval_count: 25,
				eval_duration: 3000000,
			} as OllamaChatResponse;
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await image.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
			expect(executeFunctionsMock.helpers.getBinaryDataBuffer).toHaveBeenCalledTimes(2);
			expect(executeFunctionsMock.helpers.getBinaryDataBuffer).toHaveBeenNthCalledWith(
				1,
				0,
				'image1',
			);
			expect(executeFunctionsMock.helpers.getBinaryDataBuffer).toHaveBeenNthCalledWith(
				2,
				0,
				'image2',
			);
		});

		it('should process stop sequences for image analysis', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'llava:latest';
					case 'inputType':
						return 'binary';
					case 'binaryPropertyName':
						return 'data';
					case 'text':
						return 'Describe briefly';
					case 'simplify':
						return true;
					case 'options':
						return {
							stop: 'END,DONE',
							temperature: 0.1,
						};
					default:
						return undefined;
				}
			});

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('test image'));
			apiRequestMock.mockResolvedValue({
				model: 'llava:latest',
				created_at: '2023-10-01T10:00:00Z',
				message: {
					role: 'assistant',
					content: 'A simple image.',
				},
				done: true,
			} as OllamaChatResponse);

			await image.analyze.execute.call(executeFunctionsMock, 0);

			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/api/chat', {
				body: {
					model: 'llava:latest',
					messages: [
						{
							role: 'user',
							content: 'Describe briefly',
							images: ['dGVzdCBpbWFnZQ=='], // base64 encoded 'test image'
						},
					],
					stream: false,
					options: {
						stop: ['END', 'DONE'],
						temperature: 0.1,
					},
				},
			});
		});
	});
});
