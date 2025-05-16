import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { JsonOutputParser, StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { FakeLLM, FakeChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';
import * as tracing from '@utils/tracing';

import { executeChain, NaiveJsonOutputParser } from '../methods/chainExecutor';
import * as chainExecutor from '../methods/chainExecutor';
import * as promptUtils from '../methods/promptUtils';

jest.mock('@utils/tracing', () => ({
	getTracingConfig: jest.fn(() => ({})),
}));

jest.mock('../methods/promptUtils', () => ({
	createPromptTemplate: jest.fn(),
}));

describe('chainExecutor', () => {
	let mockContext: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		mockContext = mock<IExecuteFunctions>();
		mockContext.getExecutionCancelSignal = jest.fn().mockReturnValue(undefined);
		jest.clearAllMocks();
	});

	describe('getOutputParserForLLM', () => {
		it('should return NaiveJsonOutputParser for OpenAI-like models with json_object response format', () => {
			const openAILikeModel = {
				modelKwargs: {
					response_format: {
						type: 'json_object',
					},
				},
			};

			const parser = chainExecutor.getOutputParserForLLM(
				openAILikeModel as unknown as BaseChatModel,
			);
			expect(parser).toBeInstanceOf(NaiveJsonOutputParser);
		});

		it('should return NaiveJsonOutputParser for Ollama models with json format', () => {
			const ollamaLikeModel = {
				format: 'json',
			};

			const parser = chainExecutor.getOutputParserForLLM(
				ollamaLikeModel as unknown as BaseChatModel,
			);
			expect(parser).toBeInstanceOf(NaiveJsonOutputParser);
		});

		it('should return StringOutputParser for models without JSON format settings', () => {
			const regularModel = new FakeLLM({});

			const parser = chainExecutor.getOutputParserForLLM(regularModel);
			expect(parser).toBeInstanceOf(StringOutputParser);
		});

		it('should return NaiveJsonOutputParser for Anthropic models in thinking mode', () => {
			const model = {
				lc_kwargs: {
					invocationKwargs: {
						thinking: {
							type: 'enabled',
						},
					},
				},
			};
			const parser = chainExecutor.getOutputParserForLLM(model as unknown as BaseChatModel);
			expect(parser).toBeInstanceOf(NaiveJsonOutputParser);
		});
	});

	describe('NaiveJsonOutputParser', () => {
		it('should parse valid JSON directly', async () => {
			const parser = new NaiveJsonOutputParser();
			const jsonStr = '{"name": "John", "age": 30}';

			const result = await parser.parse(jsonStr);

			expect(result).toEqual({
				name: 'John',
				age: 30,
			});
		});

		it('should handle nested JSON objects', async () => {
			const parser = new NaiveJsonOutputParser();
			const jsonStr = '{"person": {"name": "John", "age": 30}, "active": true}';

			const result = await parser.parse(jsonStr);

			expect(result).toEqual({
				person: {
					name: 'John',
					age: 30,
				},
				active: true,
			});
		});

		it('should use parent class parser for malformed JSON', async () => {
			const parser = new NaiveJsonOutputParser();
			const superParseSpy = jest.spyOn(JsonOutputParser.prototype, 'parse').mockResolvedValue({
				parsed: 'content',
			});

			const malformedJson = 'Sure, here is your JSON: {"name": "John", "age": 30}';

			await parser.parse(malformedJson);

			expect(superParseSpy).toHaveBeenCalledWith(malformedJson);
			superParseSpy.mockRestore();
		});

		it('should handle JSON with surrounding text by using parent parser', async () => {
			const parser = new NaiveJsonOutputParser();
			const jsonWithText = 'Here is the result: {"result": "success", "code": 200}';

			// Mock the parent class parse method
			const mockParsedResult = { result: 'success', code: 200 };
			const superParseSpy = jest
				.spyOn(JsonOutputParser.prototype, 'parse')
				.mockResolvedValue(mockParsedResult);

			const result = await parser.parse(jsonWithText);

			expect(superParseSpy).toHaveBeenCalledWith(jsonWithText);
			expect(result).toEqual(mockParsedResult);

			superParseSpy.mockRestore();
		});

		it('should correctly parse JSON with markdown text inside properties', async () => {
			const parser = new NaiveJsonOutputParser();
			const jsonWithMarkdown = `{
				"title": "Markdown Guide",
				"content": "# Heading 1\\n## Heading 2\\n* Bullet point\\n* Another bullet\\n\\n\`\`\`code block\`\`\`\\n> Blockquote",
				"description": "A guide with **bold** and *italic* text"
			}`;

			const result = await parser.parse(jsonWithMarkdown);

			expect(result).toEqual({
				title: 'Markdown Guide',
				content:
					'# Heading 1\n## Heading 2\n* Bullet point\n* Another bullet\n\n```code block```\n> Blockquote',
				description: 'A guide with **bold** and *italic* text',
			});
		});

		it('should correctly parse JSON with markdown code blocks containing JSON', async () => {
			const parser = new NaiveJsonOutputParser();
			const jsonWithMarkdownAndNestedJson = `{
				"title": "JSON Examples",
				"examples": "Here's an example of JSON: \`\`\`json\\n{\\"nested\\": \\"json\\", \\"in\\": \\"code block\\"}\\n\`\`\`",
				"valid": true
			}`;

			const result = await parser.parse(jsonWithMarkdownAndNestedJson);

			expect(result).toEqual({
				title: 'JSON Examples',
				examples:
					'Here\'s an example of JSON: ```json\n{"nested": "json", "in": "code block"}\n```',
				valid: true,
			});
		});

		it('should handle JSON with special characters in markdown content', async () => {
			const parser = new NaiveJsonOutputParser();
			const jsonWithSpecialChars = `{
				"title": "Special Characters",
				"content": "# Testing \\n\\n * List with **bold** & *italic*\\n * Item with [link](https://example.com)\\n * Math: 2 < 3 > 1 && true || false",
				"technical": "function test() { return x < y && z > w; }"
			}`;

			const result = await parser.parse(jsonWithSpecialChars);

			expect(result).toEqual({
				title: 'Special Characters',
				content:
					'# Testing \n\n * List with **bold** & *italic*\n * Item with [link](https://example.com)\n * Math: 2 < 3 > 1 && true || false',
				technical: 'function test() { return x < y && z > w; }',
			});
		});
	});

	describe('executeChain', () => {
		it('should execute a simple chain without output parsers', async () => {
			const fakeLLM = new FakeLLM({ response: 'Test response' });
			const mockPromptTemplate = new PromptTemplate({
				template: '{query}',
				inputVariables: ['query'],
			});

			const mockChain = {
				invoke: jest.fn().mockResolvedValue('Test response'),
			};
			const withConfigMock = jest.fn().mockReturnValue(mockChain);
			const pipeStringOutputParserMock = jest.fn().mockReturnValue({
				withConfig: withConfigMock,
			});
			const pipeMock = jest.fn().mockReturnValue({
				pipe: pipeStringOutputParserMock,
			});

			mockPromptTemplate.pipe = pipeMock;
			fakeLLM.pipe = jest.fn();

			(promptUtils.createPromptTemplate as jest.Mock).mockResolvedValue(mockPromptTemplate);

			const result = await executeChain({
				context: mockContext,
				itemIndex: 0,
				query: 'Hello',
				llm: fakeLLM,
			});

			expect(promptUtils.createPromptTemplate).toHaveBeenCalledWith({
				context: mockContext,
				itemIndex: 0,
				llm: fakeLLM,
				messages: undefined,
				query: 'Hello',
			});

			expect(pipeMock).toHaveBeenCalledWith(fakeLLM);
			expect(pipeStringOutputParserMock).toHaveBeenCalledWith(expect.any(StringOutputParser));
			expect(withConfigMock).toHaveBeenCalledWith(expect.any(Object));

			expect(result).toEqual(['Test response']);

			expect(tracing.getTracingConfig).toHaveBeenCalledWith(mockContext);
		});

		it('should execute a chain with a single output parser', async () => {
			const fakeLLM = new FakeLLM({ response: 'Test response' });
			const mockPromptTemplate = new PromptTemplate({
				template: '{query}\n{formatInstructions}',
				inputVariables: ['query'],
				partialVariables: { formatInstructions: 'Format as JSON' },
			});

			const mockChain = {
				invoke: jest.fn().mockResolvedValue({ result: 'Test response' }),
			};
			const withConfigMock = jest.fn().mockReturnValue(mockChain);
			const pipeOutputParserMock = jest.fn().mockReturnValue({
				withConfig: withConfigMock,
			});
			const pipeMock = jest.fn().mockReturnValue({
				pipe: pipeOutputParserMock,
			});

			mockPromptTemplate.pipe = pipeMock;
			fakeLLM.pipe = jest.fn();

			(promptUtils.createPromptTemplate as jest.Mock).mockResolvedValue(mockPromptTemplate);

			const result = await executeChain({
				context: mockContext,
				itemIndex: 0,
				query: 'Hello',
				llm: fakeLLM,
				outputParser: mock<N8nOutputParser>(),
			});

			expect(promptUtils.createPromptTemplate).toHaveBeenCalledWith({
				context: mockContext,
				itemIndex: 0,
				llm: fakeLLM,
				messages: undefined,
				query: 'Hello',
			});

			expect(result).toEqual([{ result: 'Test response' }]);
		});

		it('should wrap non-array responses in an array', async () => {
			const fakeLLM = new FakeLLM({ response: 'Test response' });
			const mockPromptTemplate = new PromptTemplate({
				template: '{query}',
				inputVariables: ['query'],
			});

			const mockOutputParser = mock<N8nOutputParser>();

			const mockChain = {
				invoke: jest.fn().mockResolvedValue({ result: 'Test response' }),
			};
			const withConfigMock = jest.fn().mockReturnValue(mockChain);
			const pipeOutputParserMock = jest.fn().mockReturnValue({
				withConfig: withConfigMock,
			});
			const pipeMock = jest.fn().mockReturnValue({
				pipe: pipeOutputParserMock,
			});

			mockPromptTemplate.pipe = pipeMock;
			fakeLLM.pipe = jest.fn();

			(promptUtils.createPromptTemplate as jest.Mock).mockResolvedValue(mockPromptTemplate);

			const result = await executeChain({
				context: mockContext,
				itemIndex: 0,
				query: 'Hello',
				llm: fakeLLM,
				outputParser: mockOutputParser,
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result).toEqual([{ result: 'Test response' }]);
		});

		it('should pass the execution cancel signal to the chain', async () => {
			// For this test, we'll just verify that getExecutionCancelSignal is called
			const fakeLLM = new FakeLLM({ response: 'Test response' });
			const mockPromptTemplate = new PromptTemplate({
				template: '{query}',
				inputVariables: ['query'],
			});

			const mockChain = {
				invoke: jest.fn().mockResolvedValue('Test response'),
			};
			const withConfigMock = jest.fn().mockReturnValue(mockChain);
			const pipeStringOutputParserMock = jest.fn().mockReturnValue({
				withConfig: withConfigMock,
			});
			const pipeMock = jest.fn().mockReturnValue({
				pipe: pipeStringOutputParserMock,
			});

			mockPromptTemplate.pipe = pipeMock;
			fakeLLM.pipe = jest.fn();

			(promptUtils.createPromptTemplate as jest.Mock).mockResolvedValue(mockPromptTemplate);

			await executeChain({
				context: mockContext,
				itemIndex: 0,
				query: 'Hello',
				llm: fakeLLM,
			});

			expect(mockContext.getExecutionCancelSignal).toHaveBeenCalled();
			expect(mockChain.invoke).toHaveBeenCalled();
		});

		it('should support chat models', async () => {
			const fakeChatModel = new FakeChatModel({});
			const mockChatPromptTemplate = ChatPromptTemplate.fromMessages([]);

			const mockChain = {
				invoke: jest.fn().mockResolvedValue('Test chat response'),
			};
			const withConfigMock = jest.fn().mockReturnValue(mockChain);
			const pipeStringOutputParserMock = jest.fn().mockReturnValue({
				withConfig: withConfigMock,
			});
			const pipeMock = jest.fn().mockReturnValue({
				pipe: pipeStringOutputParserMock,
			});

			mockChatPromptTemplate.pipe = pipeMock;
			fakeChatModel.pipe = jest.fn();

			(promptUtils.createPromptTemplate as jest.Mock).mockResolvedValue(mockChatPromptTemplate);

			const result = await executeChain({
				context: mockContext,
				itemIndex: 0,
				query: 'Hello',
				llm: fakeChatModel,
			});

			expect(result).toEqual(['Test chat response']);
		});

		it('should use JsonOutputParser for OpenAI models with json_object response format', async () => {
			const fakeOpenAIModel = new FakeChatModel({});
			(
				fakeOpenAIModel as unknown as { modelKwargs: { response_format: { type: string } } }
			).modelKwargs = {
				response_format: { type: 'json_object' },
			};

			const mockPromptTemplate = new PromptTemplate({
				template: '{query}',
				inputVariables: ['query'],
			});

			const mockChain = {
				invoke: jest.fn().mockResolvedValue('{"result": "json data"}'),
			};

			const withConfigMock = jest.fn().mockReturnValue(mockChain);
			const pipeOutputParserMock = jest.fn().mockReturnValue({
				withConfig: withConfigMock,
			});

			mockPromptTemplate.pipe = jest.fn().mockReturnValue({
				pipe: pipeOutputParserMock,
			});

			(promptUtils.createPromptTemplate as jest.Mock).mockResolvedValue(mockPromptTemplate);

			await executeChain({
				context: mockContext,
				itemIndex: 0,
				query: 'Hello',
				llm: fakeOpenAIModel,
			});

			expect(pipeOutputParserMock).toHaveBeenCalledWith(expect.any(JsonOutputParser));
		});

		it('should use JsonOutputParser for Ollama models with json format', async () => {
			const fakeOllamaModel = new FakeChatModel({});
			(fakeOllamaModel as unknown as { format: string }).format = 'json';

			const mockPromptTemplate = new PromptTemplate({
				template: '{query}',
				inputVariables: ['query'],
			});

			const mockChain = {
				invoke: jest.fn().mockResolvedValue('{"result": "json data"}'),
			};

			const withConfigMock = jest.fn().mockReturnValue(mockChain);
			const pipeOutputParserMock = jest.fn().mockReturnValue({
				withConfig: withConfigMock,
			});

			mockPromptTemplate.pipe = jest.fn().mockReturnValue({
				pipe: pipeOutputParserMock,
			});

			(promptUtils.createPromptTemplate as jest.Mock).mockResolvedValue(mockPromptTemplate);

			await executeChain({
				context: mockContext,
				itemIndex: 0,
				query: 'Hello',
				llm: fakeOllamaModel,
			});

			expect(pipeOutputParserMock).toHaveBeenCalledWith(expect.any(JsonOutputParser));
		});
	});
});
