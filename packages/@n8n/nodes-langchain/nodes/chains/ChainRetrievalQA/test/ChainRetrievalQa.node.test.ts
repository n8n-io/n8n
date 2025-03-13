import { Document } from '@langchain/core/documents';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { BaseRetriever } from '@langchain/core/retrievers';
import { FakeChatModel, FakeLLM, FakeRetriever } from '@langchain/core/utils/testing';
import get from 'lodash/get';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, UnexpectedError } from 'n8n-workflow';

import { ChainRetrievalQa } from '../ChainRetrievalQa.node';

const createExecuteFunctionsMock = (
	parameters: IDataObject,
	fakeLlm: BaseLanguageModel,
	fakeRetriever: BaseRetriever,
) => {
	return {
		getExecutionCancelSignal() {
			return new AbortController().signal;
		},
		getNodeParameter(parameter: string) {
			return get(parameters, parameter);
		},
		getNode() {
			return {
				typeVersion: 1.5,
			};
		},
		getInputConnectionData(type: NodeConnectionType) {
			if (type === NodeConnectionType.AiLanguageModel) {
				return fakeLlm;
			}
			if (type === NodeConnectionType.AiRetriever) {
				return fakeRetriever;
			}
			return null;
		},
		getInputData() {
			return [{ json: {} }];
		},
		getWorkflow() {
			return {
				name: 'Test Workflow',
			};
		},
		getExecutionId() {
			return 'test_execution_id';
		},
		continueOnFail() {
			return false;
		},
		logger: { debug: jest.fn() },
	} as unknown as IExecuteFunctions;
};

describe('ChainRetrievalQa', () => {
	let node: ChainRetrievalQa;
	const testDocs = [
		new Document({
			pageContent: 'The capital of France is Paris. It is known for the Eiffel Tower.',
		}),
		new Document({
			pageContent:
				'Paris is the largest city in France with a population of over 2 million people.',
		}),
	];

	const fakeRetriever = new FakeRetriever({ output: testDocs });

	beforeEach(() => {
		node = new ChainRetrievalQa();
	});

	it('should process a query using a chat model', async () => {
		// Mock a chat model that returns a predefined answer
		const mockChatModel = new FakeChatModel({});

		const params = {
			promptType: 'define',
			text: 'What is the capital of France?',
			options: {},
		};

		const result = await node.execute.call(
			createExecuteFunctionsMock(params, mockChatModel, fakeRetriever),
		);

		// Check that the result contains the expected response (FakeChatModel returns the query as response)
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json.response).toContain(
			'You are an assistant for question-answering tasks',
		); // system prompt
		expect(result[0][0].json.response).toContain('The capital of France is Paris.'); // context
		expect(result[0][0].json.response).toContain('What is the capital of France?'); // query
	});

	it('should process a query using a text completion model', async () => {
		// Mock a text completion model that returns a predefined answer
		const mockTextModel = new FakeLLM({ response: 'Paris is the capital of France.' });

		const modelCallSpy = jest.spyOn(mockTextModel, '_call');

		const params = {
			promptType: 'define',
			text: 'What is the capital of France?',
			options: {},
		};

		const result = await node.execute.call(
			createExecuteFunctionsMock(params, mockTextModel, fakeRetriever),
		);

		// Check model was called with the correct query
		expect(modelCallSpy).toHaveBeenCalled();
		expect(modelCallSpy.mock.calls[0][0]).toEqual(
			expect.stringContaining('Question: What is the capital of France?'),
		);

		// Check that the result contains the expected response
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json).toEqual({
			response: 'Paris is the capital of France.',
		});
	});

	it('should use a custom system prompt if provided', async () => {
		const customSystemPrompt = `You are a geography expert. Use the following context to answer the question.
			----------------
			Context: {context}`;

		// The chat model will return a response indicating it received the custom prompt
		const mockChatModel = new FakeChatModel({});

		const params = {
			promptType: 'define',
			text: 'What is the capital of France?',
			options: {
				systemPromptTemplate: customSystemPrompt,
			},
		};

		const result = await node.execute.call(
			createExecuteFunctionsMock(params, mockChatModel, fakeRetriever),
		);

		expect(result).toHaveLength(1);
		expect(result[0][0].json.response).toContain('You are a geography expert.');
	});

	it('should throw an error if the query is undefined', async () => {
		const mockChatModel = new FakeChatModel({});

		const params = {
			promptType: 'define',
			text: undefined, // undefined query
			options: {},
		};

		await expect(
			node.execute.call(createExecuteFunctionsMock(params, mockChatModel, fakeRetriever)),
		).rejects.toThrow(NodeOperationError);
	});

	it('should add error to json if continueOnFail is true', async () => {
		// Create a model that will throw an error
		class ErrorLLM extends FakeLLM {
			async _call(): Promise<string> {
				throw new UnexpectedError('Model error');
			}
		}

		const errorModel = new ErrorLLM({});

		const params = {
			promptType: 'define',
			text: 'What is the capital of France?',
			options: {},
		};

		// Override continueOnFail to return true
		const execMock = createExecuteFunctionsMock(params, errorModel, fakeRetriever);
		execMock.continueOnFail = () => true;

		const result = await node.execute.call(execMock);

		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json).toHaveProperty('error');
		expect(result[0][0].json.error).toContain('Model error');
	});
});
