import { Document } from '@langchain/core/documents';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { BaseRetriever } from '@langchain/core/retrievers';
import { FakeChatModel, FakeLLM, FakeRetriever } from '@langchain/core/utils/testing';
import get from 'lodash/get';
import type { IDataObject, IExecuteFunctions, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, UnexpectedError } from 'n8n-workflow';

import { ChainRetrievalQa } from '../ChainRetrievalQa.node';

const createExecuteFunctionsMock = (
	parameters: IDataObject,
	fakeLlm: BaseLanguageModel,
	fakeRetriever: BaseRetriever,
	version: number,
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
				typeVersion: version,
			};
		},
		getInputConnectionData(type: NodeConnectionType) {
			if (type === NodeConnectionTypes.AiLanguageModel) {
				return fakeLlm;
			}
			if (type === NodeConnectionTypes.AiRetriever) {
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

	it.each([1.3, 1.4, 1.5, 1.6])(
		'should process a query using a chat model (version %s)',
		async (version) => {
			// Mock a chat model that returns a predefined answer
			const mockChatModel = new FakeChatModel({});

			const params = {
				promptType: 'define',
				text: 'What is the capital of France?',
				options: {},
			};

			const result = await node.execute.call(
				createExecuteFunctionsMock(params, mockChatModel, fakeRetriever, version),
			);

			// Check that the result contains the expected response (FakeChatModel returns the query as response)
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json.response).toBeDefined();

			let responseText = result[0][0].json.response;
			if (version < 1.5 && typeof responseText === 'object') {
				responseText = (responseText as { text: string }).text;
			}

			expect(responseText).toContain('You are an assistant for question-answering tasks'); // system prompt
			expect(responseText).toContain('The capital of France is Paris.'); // context
			expect(responseText).toContain('What is the capital of France?'); // query
		},
	);

	it.each([1.3, 1.4, 1.5, 1.6])(
		'should process a query using a text completion model (version %s)',
		async (version) => {
			// Mock a text completion model that returns a predefined answer
			const mockTextModel = new FakeLLM({ response: 'Paris is the capital of France.' });

			const modelCallSpy = jest.spyOn(mockTextModel, '_call');

			const params = {
				promptType: 'define',
				text: 'What is the capital of France?',
				options: {},
			};

			const result = await node.execute.call(
				createExecuteFunctionsMock(params, mockTextModel, fakeRetriever, version),
			);

			// Check model was called with the correct query
			expect(modelCallSpy).toHaveBeenCalled();
			expect(modelCallSpy.mock.calls[0][0]).toEqual(
				expect.stringContaining('Question: What is the capital of France?'),
			);

			// Check that the result contains the expected response
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);

			if (version < 1.5) {
				expect((result[0][0].json.response as { text: string }).text).toContain(
					'Paris is the capital of France.',
				);
			} else {
				expect(result[0][0].json).toEqual({
					response: 'Paris is the capital of France.',
				});
			}
		},
	);

	it.each([1.3, 1.4, 1.5, 1.6])(
		'should use a custom system prompt if provided (version %s)',
		async (version) => {
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
				createExecuteFunctionsMock(params, mockChatModel, fakeRetriever, version),
			);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			if (version < 1.5) {
				expect((result[0][0].json.response as { text: string }).text).toContain(
					'You are a geography expert.',
				);
			} else {
				expect(result[0][0].json.response).toContain('You are a geography expert.');
			}
		},
	);

	it.each([1.3, 1.4, 1.5, 1.6])(
		'should throw an error if the query is undefined (version %s)',
		async (version) => {
			const mockChatModel = new FakeChatModel({});

			const params = {
				promptType: 'define',
				text: undefined, // undefined query
				options: {},
			};

			await expect(
				node.execute.call(
					createExecuteFunctionsMock(params, mockChatModel, fakeRetriever, version),
				),
			).rejects.toThrow(NodeOperationError);
		},
	);

	it.each([1.3, 1.4, 1.5, 1.6])(
		'should add error to json if continueOnFail is true (version %s)',
		async (version) => {
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
			const execMock = createExecuteFunctionsMock(params, errorModel, fakeRetriever, version);
			execMock.continueOnFail = () => true;

			const result = await node.execute.call(execMock);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error');
			expect(result[0][0].json.error).toContain('Model error');
		},
	);

	it('should process items in batches', async () => {
		const mockChatModel = new FakeLLM({ response: 'Paris is the capital of France.' });
		const items = [
			{ json: { input: 'What is the capital of France?' } },
			{ json: { input: 'What is the capital of France?' } },
			{ json: { input: 'What is the capital of France?' } },
		];

		const execMock = createExecuteFunctionsMock(
			{
				promptType: 'define',
				text: '={{ $json.input }}',
				options: {
					batching: {
						batchSize: 2,
						delayBetweenBatches: 0,
					},
				},
			},
			mockChatModel,
			fakeRetriever,
			1.6,
		);

		execMock.getInputData = () => items;

		const result = await node.execute.call(execMock);

		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(3);
		result[0].forEach((item) => {
			expect(item.json.response).toBeDefined();
		});

		expect(result[0][0].json.response).toContain('Paris is the capital of France.');
		expect(result[0][1].json.response).toContain('Paris is the capital of France.');
		expect(result[0][2].json.response).toContain('Paris is the capital of France.');
	});

	it('should handle errors in batches with continueOnFail', async () => {
		class ErrorLLM extends FakeLLM {
			async _call(): Promise<string> {
				throw new UnexpectedError('Model error');
			}
		}

		const errorModel = new ErrorLLM({});
		const items = [
			{ json: { input: 'What is the capital of France?' } },
			{ json: { input: 'What is the population of Paris?' } },
		];

		const execMock = createExecuteFunctionsMock(
			{
				promptType: 'define',
				text: '={{ $json.input }}',
				options: {
					batching: {
						batchSize: 2,
						delayBetweenBatches: 0,
					},
				},
			},
			errorModel,
			fakeRetriever,
			1.6,
		);

		execMock.getInputData = () => items;
		execMock.continueOnFail = () => true;

		const result = await node.execute.call(execMock);

		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(2);
		result[0].forEach((item) => {
			expect(item.json.error).toContain('Model error');
		});
	});

	it('should respect delay between batches', async () => {
		const mockChatModel = new FakeChatModel({});
		const items = [
			{ json: { input: 'What is the capital of France?' } },
			{ json: { input: 'What is the population of Paris?' } },
			{ json: { input: 'What is France known for?' } },
		];

		const execMock = createExecuteFunctionsMock(
			{
				promptType: 'define',
				text: '={{ $json.input }}',
				options: {
					batching: {
						batchSize: 2,
						delayBetweenBatches: 100,
					},
				},
			},
			mockChatModel,
			fakeRetriever,
			1.6,
		);

		execMock.getInputData = () => items;

		const startTime = Date.now();
		await node.execute.call(execMock);
		const endTime = Date.now();

		// Should take at least 100ms due to delay between batches
		expect(endTime - startTime).toBeGreaterThanOrEqual(100);
	});
});
