import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { JsonOutputParser, StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { FakeLLM, FakeChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';
import * as tracing from '@utils/tracing';

import { executeChain } from '../methods/chainExecutor';
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
		it('should return JsonOutputParser for OpenAI-like models with json_object response format', () => {
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
			expect(parser).toBeInstanceOf(JsonOutputParser);
		});

		it('should return JsonOutputParser for Ollama models with json format', () => {
			const ollamaLikeModel = {
				format: 'json',
			};

			const parser = chainExecutor.getOutputParserForLLM(
				ollamaLikeModel as unknown as BaseChatModel,
			);
			expect(parser).toBeInstanceOf(JsonOutputParser);
		});

		it('should return StringOutputParser for models without JSON format settings', () => {
			const regularModel = new FakeLLM({});

			const parser = chainExecutor.getOutputParserForLLM(regularModel);
			expect(parser).toBeInstanceOf(StringOutputParser);
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
