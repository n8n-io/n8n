import lodashGet from 'lodash/get';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { FunctionTool } from 'openai/resources/responses/responses';

import { getBinaryDataFile } from '../../../../helpers/binary-data';
import { formatInputMessages, createRequest } from '../../../../v2/actions/text/helpers/responses';

jest.mock('../../../../helpers/binary-data', () => ({
	getBinaryDataFile: jest.fn(),
}));

const mockGetBinaryDataFile = jest.mocked(getBinaryDataFile);

const createExecuteFunctionsMock = (parameters: IDataObject): IExecuteFunctions => {
	const nodeParameters = parameters;
	return {
		getExecutionCancelSignal() {
			return new AbortController().signal;
		},
		getNodeParameter(parameter: string, _itemIndex: number, defaultValue?: unknown) {
			return lodashGet(nodeParameters, parameter, defaultValue);
		},
		getNode() {
			return {
				id: 'test-node',
				name: 'Test Node',
				type: 'n8n-nodes-langchain.openAi',
				typeVersion: 2,
				position: [0, 0],
				parameters: {},
			};
		},
		getInputConnectionData() {
			return undefined;
		},
		helpers: {
			prepareBinaryData: jest.fn().mockResolvedValue({
				data: 'base64data',
				mimeType: 'text/plain',
				fileName: 'test.txt',
			}),
			assertBinaryData: jest.fn().mockReturnValue({
				filename: 'test.txt',
				contentType: 'text/plain',
			}),
			getBinaryDataBuffer: jest.fn().mockReturnValue(Buffer.from('test data')),
			binaryToBuffer: jest.fn().mockResolvedValue(Buffer.from('test data')),
			getBinaryStream: jest.fn().mockResolvedValue(Buffer.from('test data')),
		},
	} as unknown as IExecuteFunctions;
};

describe('OpenAI Responses Helper Functions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetBinaryDataFile.mockResolvedValue({
			filename: 'test.png',
			contentType: 'image/png',
			fileContent: Buffer.from('test image data'),
		});
	});

	describe('formatInputMessages', () => {
		it('should format text messages correctly', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'user',
					type: 'text',
					content: 'Hello, how are you?',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([
				{
					role: 'user',
					content: [{ type: 'input_text', text: 'Hello, how are you?' }],
				},
			]);
		});

		it('should format text messages without type (defaults to text)', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'assistant',
					content: 'I am doing well, thank you!',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([
				{
					role: 'assistant',
					content: [{ type: 'input_text', text: 'I am doing well, thank you!' }],
				},
			]);
		});

		it('should format image messages with URL', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'user',
					type: 'image',
					imageType: 'url',
					imageUrl: 'https://example.com/image.png',
					imageDetail: 'high',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([
				{
					role: 'user',
					content: [
						{
							type: 'input_image',
							detail: 'high',
							image_url: 'https://example.com/image.png',
						},
					],
				},
			]);
		});

		it('should format image messages with file ID', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'user',
					type: 'image',
					imageType: 'fileId',
					fileId: 'file-1234567890',
					imageDetail: 'low',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([
				{
					role: 'user',
					content: [
						{
							type: 'input_image',
							detail: 'low',
							file_id: 'file-1234567890',
						},
					],
				},
			]);
		});

		it('should format image messages with base64 data', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'user',
					type: 'image',
					imageType: 'base64',
					binaryPropertyName: 'imageData',
					imageDetail: 'auto',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(mockGetBinaryDataFile).toHaveBeenCalledWith(executeFunctions, 0, 'imageData');
			expect(executeFunctions.helpers.binaryToBuffer).toHaveBeenCalledWith(
				Buffer.from('test image data'),
			);
			expect(result).toEqual([
				{
					role: 'user',
					content: [
						{
							type: 'input_image',
							detail: 'auto',
							image_url: 'data:image/png;base64,dGVzdCBkYXRh',
						},
					],
				},
			]);
		});

		it('should format image messages with default detail when not specified', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'user',
					type: 'image',
					imageType: 'url',
					imageUrl: 'https://example.com/image.png',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([
				{
					role: 'user',
					content: [
						{
							type: 'input_image',
							detail: 'auto',
							image_url: 'https://example.com/image.png',
						},
					],
				},
			]);
		});

		it('should format file messages with URL', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'user',
					type: 'file',
					fileType: 'url',
					fileUrl: 'https://example.com/document.pdf',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([
				{
					role: 'user',
					content: [
						{
							type: 'input_file',
							file_url: 'https://example.com/document.pdf',
						},
					],
				},
			]);
		});

		it('should format file messages with file ID', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'user',
					type: 'file',
					fileType: 'fileId',
					fileId: 'file-1234567890',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([
				{
					role: 'user',
					content: [
						{
							type: 'input_file',
							file_id: 'file-1234567890',
						},
					],
				},
			]);
		});

		it('should format file messages with base64 data', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'user',
					type: 'file',
					fileType: 'base64',
					binaryPropertyName: 'fileData',
					fileName: 'document.pdf',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(mockGetBinaryDataFile).toHaveBeenCalledWith(executeFunctions, 0, 'fileData');
			expect(executeFunctions.helpers.binaryToBuffer).toHaveBeenCalledWith(
				Buffer.from('test image data'),
			);
			expect(result).toEqual([
				{
					role: 'user',
					content: [
						{
							type: 'input_file',
							filename: 'document.pdf',
							file_data: 'data:image/png;base64,dGVzdCBkYXRh',
						},
					],
				},
			]);
		});

		it('should format file messages without file name', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'user',
					type: 'file',
					fileType: 'url',
					fileUrl: 'https://example.com/document.pdf',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([
				{
					role: 'user',
					content: [
						{
							type: 'input_file',
							file_url: 'https://example.com/document.pdf',
						},
					],
				},
			]);
		});

		it('should handle multiple messages with different types', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages = [
				{
					role: 'system',
					type: 'text',
					content: 'You are a helpful assistant.',
				},
				{
					role: 'user',
					type: 'image',
					imageType: 'url',
					imageUrl: 'https://example.com/image.png',
				},
				{
					role: 'assistant',
					content: 'I can see the image you shared.',
				},
			];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([
				{
					role: 'system',
					content: [{ type: 'input_text', text: 'You are a helpful assistant.' }],
				},
				{
					role: 'user',
					content: [
						{
							type: 'input_image',
							detail: 'auto',
							image_url: 'https://example.com/image.png',
						},
					],
				},
				{
					role: 'assistant',
					content: [{ type: 'input_text', text: 'I can see the image you shared.' }],
				},
			]);
		});

		it('should handle empty messages array', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const messages: IDataObject[] = [];

			const result = await formatInputMessages.call(executeFunctions, 0, messages);

			expect(result).toEqual([]);
		});
	});

	describe('createRequest', () => {
		it('should create a basic request with minimal options', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				background: false,
			});
		});

		it('should create a request with all basic options', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					instructions: 'You are a helpful assistant',
					maxTokens: 1000,
					previousResponseId: 'resp_123',
					promptCacheKey: 'cache_key',
					safetyIdentifier: 'safety_123',
					serviceTier: 'fast',
					temperature: 0.7,
					topP: 0.9,
					topLogprobs: 5,
					maxToolCalls: 10,
					parallelToolCalls: false,
					store: false,
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				instructions: 'You are a helpful assistant',
				max_output_tokens: 1000,
				previous_response_id: 'resp_123',
				prompt_cache_key: 'cache_key',
				safety_identifier: 'safety_123',
				service_tier: 'fast',
				temperature: 0.7,
				top_p: 0.9,
				top_logprobs: 5,
				max_tool_calls: 10,
				parallel_tool_calls: false,
				store: false,
				background: false,
			});
		});

		it('should handle truncation option', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					truncation: true,
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				truncation: 'auto',
				background: false,
			});
		});

		it('should handle truncation disabled', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					truncation: false,
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				truncation: 'disabled',
				background: false,
			});
		});

		it('should handle conversation ID', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					conversationId: 'conv_1234567890',
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				conversation: 'conv_1234567890',
				background: false,
			});
		});

		it('should handle include options', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					include: ['usage', 'prompt_annotations'],
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				include: ['usage', 'prompt_annotations'],
				background: false,
			});
		});

		it('should handle metadata', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					metadata: '{"custom": "value", "source": "test"}',
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				metadata: { custom: 'value', source: 'test' },
				background: false,
			});
		});

		it('should handle prompt configuration', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					promptConfig: {
						promptOptions: {
							promptId: 'prompt_123',
							version: 'v1',
							variables: '{"name": "John"}',
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				prompt: {
					id: 'prompt_123',
					version: 'v1',
					variables: { name: 'John' },
				},
				background: false,
			});
		});

		it('should handle prompt configuration without variables', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					promptConfig: {
						promptOptions: {
							promptId: 'prompt_123',
							version: 'v1',
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				prompt: {
					id: 'prompt_123',
					version: 'v1',
				},
				background: false,
			});
		});

		it('should handle reasoning configuration', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					reasoning: {
						reasoningOptions: {
							effort: 'high',
							summary: 'detailed',
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				reasoning: {
					effort: 'high',
					summary: 'detailed',
				},
				background: false,
			});
		});

		it('should handle reasoning configuration with none summary', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					reasoning: {
						reasoningOptions: {
							effort: 'high',
							summary: 'none',
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				reasoning: {
					effort: 'high',
				},
				background: false,
			});
		});

		it('should handle text format configuration with JSON schema', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					textFormat: {
						textOptions: {
							type: 'json_schema',
							name: 'response_schema',
							schema: '{"type": "object", "properties": {"message": {"type": "string"}}}',
							verbosity: 'medium',
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				text: {
					verbosity: 'medium',
					format: {
						type: 'json_schema',
						name: 'response_schema',
						schema: { type: 'object', properties: { message: { type: 'string' } } },
					},
				},
				background: false,
			});
		});

		it('should handle text format configuration with JSON object', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					textFormat: {
						textOptions: {
							type: 'json_object',
							verbosity: 'high',
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'system',
						content: [
							{ type: 'input_text', text: 'You are a helpful assistant designed to output JSON.' },
						],
					},
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				text: {
					verbosity: 'high',
					format: {
						type: 'json_object',
					},
				},
				background: false,
			});
		});

		it('should handle text format configuration with text type', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					textFormat: {
						textOptions: {
							type: 'text',
							verbosity: 'low',
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				text: {
					verbosity: 'low',
					format: {
						type: 'text',
					},
				},
				background: false,
			});
		});

		it('should handle built-in tools - web search', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {},
				builtInTools: {
					webSearch: {
						searchContextSize: 'high',
						allowedDomains: 'example.com, test.com',
						country: 'US',
						city: 'New York',
						region: 'NY',
					},
				},
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				tools: [
					{
						type: 'web_search',
						search_context_size: 'high',
						user_location: {
							type: 'approximate',
							country: 'US',
							city: 'New York',
							region: 'NY',
						},
						filters: {
							allowed_domains: ['example.com', 'test.com'],
						},
					},
				],
				background: false,
			});
		});

		it('should handle built-in tools - code interpreter', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {},
				builtInTools: {
					codeInterpreter: true,
				},
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				tools: [
					{
						type: 'code_interpreter',
						container: {
							type: 'auto',
						},
					},
				],
				background: false,
			});
		});

		it('should handle built-in tools - file search', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {},
				builtInTools: {
					fileSearch: {
						vectorStoreIds: '["vs_123", "vs_456"]',
						filters: '{"file_type": "pdf"}',
						maxResults: 10,
					},
				},
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				tools: [
					{
						type: 'file_search',
						vector_store_ids: ['vs_123', 'vs_456'],
						filters: { file_type: 'pdf' },
						max_num_results: 10,
					},
				],
				background: false,
			});
		});

		it('should handle MCP servers', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {},
				builtInTools: {
					mcpServers: {
						mcpServerOptions: [
							{
								serverLabel: 'Test Server',
								serverUrl: 'https://example.com/mcp',
								connectorId: 'conn_123',
								authorization: 'Bearer token',
								allowedTools: 'tool1, tool2',
								headers: '{"X-Custom": "value"}',
								serverDescription: 'Test MCP server',
							},
						],
					},
				},
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				tools: [
					{
						type: 'mcp',
						server_label: 'Test Server',
						server_url: 'https://example.com/mcp',
						connector_id: 'conn_123',
						authorization: 'Bearer token',
						allowed_tools: ['tool1', 'tool2'],
						headers: { 'X-Custom': 'value' },
						require_approval: 'never',
						server_description: 'Test MCP server',
					},
				],
				background: false,
			});
		});

		it('should handle external tools', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const externalTools = [
				{
					type: 'function',
					function: {
						name: 'test_function',
						description: 'A test function',
						parameters: { type: 'object' },
					},
				},
			];

			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {},
				builtInTools: undefined,
				tools: externalTools as unknown as FunctionTool[],
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				tools: externalTools,
				background: false,
			});
		});

		it('should handle background mode', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					backgroundMode: {
						values: {
							enabled: true,
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				background: true,
			});
		});

		it('should remove empty properties from final result', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					instructions: '',
					maxTokens: undefined,
					temperature: 0,
				},
				builtInTools: undefined,
				tools: undefined,
			};

			const result = await createRequest.call(executeFunctions, 0, options);

			expect(result).toEqual({
				model: 'gpt-4',
				input: [
					{
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
				parallel_tool_calls: true,
				store: true,
				temperature: 0,
				background: false,
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid JSON in metadata', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					metadata: 'invalid json',
				},
				builtInTools: undefined,
				tools: undefined,
			};

			await expect(createRequest.call(executeFunctions, 0, options)).rejects.toThrow(
				'Failed to parse metadata',
			);
		});

		it('should handle invalid JSON in prompt variables', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					promptConfig: {
						promptOptions: {
							promptId: 'prompt_123',
							version: 'v1',
							variables: 'invalid json',
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			await expect(createRequest.call(executeFunctions, 0, options)).rejects.toThrow(
				'Failed to parse prompt variables',
			);
		});

		it('should handle invalid JSON in text format schema', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					textFormat: {
						textOptions: {
							type: 'json_schema',
							name: 'response_schema',
							schema: 'invalid json',
							verbosity: 'medium',
						},
					},
				},
				builtInTools: undefined,
				tools: undefined,
			};

			await expect(createRequest.call(executeFunctions, 0, options)).rejects.toThrow(
				'Failed to parse schema',
			);
		});

		it('should handle invalid JSON in file search filters', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {},
				builtInTools: {
					fileSearch: {
						vectorStoreIds: '["vs_123"]',
						filters: 'invalid json',
						maxResults: 10,
					},
				},
				tools: undefined,
			};

			await expect(createRequest.call(executeFunctions, 0, options)).rejects.toThrow(
				'Failed to parse filters',
			);
		});

		it('should handle invalid JSON in MCP server headers', async () => {
			const executeFunctions = createExecuteFunctionsMock({});
			const options = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {},
				builtInTools: {
					mcpServers: {
						mcpServerOptions: [
							{
								serverLabel: 'Test Server',
								serverUrl: 'https://example.com/mcp',
								connectorId: 'conn_123',
								authorization: 'Bearer token',
								allowedTools: 'tool1',
								headers: 'invalid json',
								serverDescription: 'Test MCP server',
							},
						],
					},
				},
				tools: undefined,
			};

			await expect(createRequest.call(executeFunctions, 0, options)).rejects.toThrow(
				'Failed to parse headers',
			);
		});
	});
});
