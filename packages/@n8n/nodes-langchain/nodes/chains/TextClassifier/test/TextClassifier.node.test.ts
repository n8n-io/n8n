import { FakeChatModel } from '@langchain/core/utils/testing';
import * as n8nUtilsSleep from '@n8n/utils/sleep';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { processItem } from '../processItem';
import { TextClassifier } from '../TextClassifier.node';

vi.mock('../processItem', () => ({
	processItem: vi.fn(),
}));

vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn().mockResolvedValue(undefined),
}));

// The only way to see the schema the node hands the model: every test stubs
// `processItem`, so the parser is where the option becomes observable.
const fromZodSchema = vi.hoisted(() => vi.fn());
vi.mock('@langchain/classic/output_parsers', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@langchain/classic/output_parsers')>();
	return {
		...actual,
		StructuredOutputParser: {
			...actual.StructuredOutputParser,
			fromZodSchema: (schema: { shape: Record<string, unknown> }) => {
				fromZodSchema(schema);
				return actual.StructuredOutputParser.fromZodSchema(schema as never);
			},
		},
	};
});

describe('TextClassifier Node', () => {
	let node: TextClassifier;
	let mockExecuteFunction: Mocked<IExecuteFunctions>;

	beforeEach(() => {
		vi.resetAllMocks();
		node = new TextClassifier();
		mockExecuteFunction = mock<IExecuteFunctions>();

		mockExecuteFunction.logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		mockExecuteFunction.getInputData.mockReturnValue([{ json: { testValue: 'none' } }]);
		mockExecuteFunction.getNode.mockReturnValue({
			name: 'Text Classifier',
			typeVersion: 1.1,
			parameters: {},
		} as INode);

		mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
			if (param === 'inputText') return 'Test input';
			if (param === 'categories.categories')
				return [{ category: 'test', description: 'test category' }];
			return defaultValue;
		});

		const fakeLLM = new FakeChatModel({});
		mockExecuteFunction.getInputConnectionData.mockResolvedValue(fakeLLM);
	});

	describe('execute', () => {
		it('should process items with correct parameters', async () => {
			(processItem as Mock).mockResolvedValue({ matched: ['test'], fallback: false });

			const result = await node.execute.call(mockExecuteFunction);

			expect(processItem).toHaveBeenCalledWith(
				mockExecuteFunction,
				0,
				expect.any(FakeChatModel),
				expect.any(Object),
				[{ category: 'test', description: 'test category' }],
				expect.any(String),
				'If there is not a very fitting category, select none of the categories.',
			);

			expect(result).toEqual([[{ json: { testValue: 'none' }, pairedItem: { item: 0 } }]]);
		});

		it('gives each branch its own copy of a multi-class item', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [
						{ category: 'test1', description: 'first' },
						{ category: 'test2', description: 'second' },
					];
				return defaultValue;
			});
			(processItem as Mock).mockResolvedValue({ matched: ['test1', 'test2'], fallback: false });

			const result = await node.execute.call(mockExecuteFunction);

			expect(result[0][0]).not.toBe(result[1][0]);
			expect(result[0][0].json).not.toBe(result[1][0].json);
			expect(result[0][0].json).toEqual(result[1][0].json);
		});

		// The model answers with one key per category. Routing read that object
		// directly until the result became a typed list, and a schema that made every
		// value an object would have sent every item to every branch.
		it('routes only the categories the model matched', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [
						{ category: 'test1', description: 'first' },
						{ category: 'test2', description: 'second' },
					];
				return defaultValue;
			});
			(processItem as Mock).mockResolvedValue({ matched: ['test2'], fallback: false });

			const result = await node.execute.call(mockExecuteFunction);

			expect(result[0]).toHaveLength(0);
			expect(result[1]).toHaveLength(1);
		});

		it('carries the rest of the item onto the branch', async () => {
			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 }, binary: { file: { data: 'x', mimeType: 'text/plain' } } },
			]);
			(processItem as Mock).mockResolvedValue({ matched: ['test'], fallback: false });

			const result = await node.execute.call(mockExecuteFunction);

			expect(result[0][0].binary).toEqual({ file: { data: 'x', mimeType: 'text/plain' } });
		});

		it('leaves the input items alone', async () => {
			const input = [{ json: { item: 1 } }];
			mockExecuteFunction.getInputData.mockReturnValue(input);
			(processItem as Mock).mockResolvedValue({ matched: ['test'], fallback: false });

			await node.execute.call(mockExecuteFunction);

			expect(input).toEqual([{ json: { item: 1 } }]);
		});

		it('should handle multiple input items', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [
						{ category: 'test1', description: 'test category' },
						{ category: 'test2', description: 'some other category' },
					];
				return defaultValue;
			});
			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
			]);

			(processItem as Mock)
				.mockResolvedValueOnce({ matched: ['test1'], fallback: false })
				.mockResolvedValueOnce({ matched: ['test2'], fallback: false });

			const result = await node.execute.call(mockExecuteFunction);

			expect(processItem).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(2);
			expect(result[0][0].json).toEqual({ item: 1 });
			expect(result[1][0].json).toEqual({ item: 2 });
		});

		it('should process items in batches when batchSize is set', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [{ category: 'test', description: 'test category' }];
				if (param === 'batchSize') return 2;
				return defaultValue;
			});

			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
				{ json: { item: 3 } },
				{ json: { item: 4 } },
			]);

			(processItem as Mock)
				.mockResolvedValueOnce({ matched: ['test'], fallback: false })
				.mockResolvedValueOnce({ matched: ['test'], fallback: false })
				.mockResolvedValueOnce({ matched: ['test'], fallback: false })
				.mockResolvedValueOnce({ matched: ['test'], fallback: false });

			const result = await node.execute.call(mockExecuteFunction);

			expect(processItem).toHaveBeenCalledTimes(4);
			expect(result[0]).toHaveLength(4);
			expect(result[0]).toEqual([
				{ json: { item: 1 }, pairedItem: { item: 0 } },
				{ json: { item: 2 }, pairedItem: { item: 1 } },
				{ json: { item: 3 }, pairedItem: { item: 2 } },
				{ json: { item: 4 }, pairedItem: { item: 3 } },
			]);
		});

		// Every other test here leaves `options.batching.batchSize` at its default of 5,
		// so they all take the batch path. This is the only cover for the other one.
		it('routes the same way with batching off', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [{ category: 'test', description: 'test category' }];
				if (param === 'options.batching.batchSize') return 1;
				return defaultValue;
			});
			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
			]);
			(processItem as Mock).mockResolvedValue({ matched: ['test'], fallback: false });

			const result = await node.execute.call(mockExecuteFunction);

			expect(result[0]).toEqual([
				{ json: { item: 1 }, pairedItem: { item: 0 } },
				{ json: { item: 2 }, pairedItem: { item: 1 } },
			]);
		});

		it('should respect delayBetweenBatches', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [{ category: 'test', description: 'test category' }];
				if (param === 'options.batching.batchSize') return 2;
				if (param === 'options.batching.delayBetweenBatches') return 100;
				return defaultValue;
			});

			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
				{ json: { item: 3 } },
				{ json: { item: 4 } },
				{ json: { item: 5 } },
				{ json: { item: 6 } },
			]);

			(processItem as Mock).mockResolvedValue({ matched: ['test'], fallback: false });

			await node.execute.call(mockExecuteFunction);

			// 6 items with batchSize 2 => 3 batches => a delay after every batch but the last
			expect(n8nUtilsSleep.sleep).toHaveBeenCalledTimes(2);
			expect(n8nUtilsSleep.sleep).toHaveBeenCalledWith(100);
		});

		it('should handle errors in batch processing', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [{ category: 'test', description: 'test category' }];
				if (param === 'batchSize') return 2;
				return defaultValue;
			});

			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
				{ json: { item: 3 } },
			]);

			(processItem as Mock)
				.mockResolvedValueOnce({ matched: ['test'], fallback: false })
				.mockRejectedValueOnce(new Error('Batch error'))
				.mockResolvedValueOnce({ matched: ['test'], fallback: false });

			mockExecuteFunction.continueOnFail.mockReturnValue(true);

			const result = await node.execute.call(mockExecuteFunction);

			expect(result[0]).toHaveLength(3);
			expect(result[0][1].json).toHaveProperty('error', 'Batch error');
		});

		describe('confidence scores', () => {
			const withCategories = (
				categories: Array<{ category: string; description: string }>,
				options: Record<string, unknown> = {},
			) => {
				mockExecuteFunction.getNodeParameter.mockImplementation(
					(param, _itemIndex, defaultValue) => {
						if (param === 'inputText') return 'Test input';
						if (param === 'categories.categories') return categories;
						if (param === 'options') return { includeConfidenceScores: true, ...options };
						return defaultValue;
					},
				);
			};
			const twoCategories = [
				{ category: 'Billing', description: 'first' },
				{ category: 'Urgent', description: 'second' },
			];

			it.each([
				['asks the model for scores when the option is on', true, true],
				['leaves them out when it is off', false, false],
			])('%s', async (_name, on, asked) => {
				withCategories(twoCategories, on ? {} : { includeConfidenceScores: false });
				(processItem as Mock).mockResolvedValue({ matched: [], fallback: false });

				await node.execute.call(mockExecuteFunction);

				const schema = fromZodSchema.mock.calls.at(-1)?.[0] as { shape: Record<string, unknown> };
				expect('confidence' in schema.shape).toBe(asked);
			});

			it('adds nothing while the option is off', async () => {
				(processItem as Mock).mockResolvedValue({
					matched: ['test'],
					fallback: false,
					scores: { test: 0.9 },
				});

				const result = await node.execute.call(mockExecuteFunction);

				expect(result[0][0].json).toEqual({ testValue: 'none' });
			});

			it('gives each branch the score for its own category', async () => {
				withCategories(twoCategories);
				mockExecuteFunction.getInputData.mockReturnValue([{ json: { id: 7 } }]);
				(processItem as Mock).mockResolvedValue({
					matched: ['Billing', 'Urgent'],
					fallback: false,
					scores: { Billing: 0.92, Urgent: 0.61 },
				});

				const result = await node.execute.call(mockExecuteFunction);

				expect(result[0][0].json).toEqual({
					id: 7,
					classification: {
						category: 'Billing',
						confidence: 0.92,
						scores: { Billing: 0.92, Urgent: 0.61 },
					},
				});
				expect(result[1][0].json).toEqual({
					id: 7,
					classification: {
						category: 'Urgent',
						confidence: 0.61,
						scores: { Billing: 0.92, Urgent: 0.61 },
					},
				});
			});

			it('labels the Other branch and scores it from the fallback answer', async () => {
				withCategories(twoCategories, { fallback: 'other' });
				mockExecuteFunction.getInputData.mockReturnValue([{ json: { id: 7 } }]);
				(processItem as Mock).mockResolvedValue({
					matched: [],
					fallback: true,
					scores: { Billing: 0.1, Urgent: 0.05, fallback: 0.8 },
				});

				const result = await node.execute.call(mockExecuteFunction);

				expect(result[2][0].json.classification).toEqual({
					category: 'Other',
					confidence: 0.8,
					// The Other branch is the absence of a category, so it is not scored here
					scores: { Billing: 0.1, Urgent: 0.05 },
				});
			});

			// `toEqual` ignores a key whose value is undefined, so the absence has to be
			// asserted on its own or the `!== undefined` guards survive being removed.
			it('still reports the category when the model gave no usable score', async () => {
				withCategories(twoCategories);
				(processItem as Mock).mockResolvedValue({ matched: ['Billing'], fallback: false });

				const result = await node.execute.call(mockExecuteFunction);

				const { classification } = result[0][0].json as { classification: object };
				expect(classification).toEqual({ category: 'Billing' });
				expect(Object.keys(classification)).toEqual(['category']);
			});

			// Only the fallback was scored, so the map the branches share is empty and
			// must be left out rather than emitted as `{}`.
			it('leaves out an empty score map', async () => {
				withCategories(twoCategories, { fallback: 'other' });
				(processItem as Mock).mockResolvedValue({
					matched: ['Billing'],
					fallback: false,
					scores: { fallback: 0.4 },
				});

				const result = await node.execute.call(mockExecuteFunction);

				const { classification } = result[0][0].json as { classification: object };
				expect(Object.keys(classification)).toEqual(['category']);
			});

			// A score of 0 is a real answer the wording asks for, not a missing one.
			it('reports a score of zero', async () => {
				withCategories(twoCategories);
				(processItem as Mock).mockResolvedValue({
					matched: ['Billing'],
					fallback: false,
					scores: { Billing: 0, Urgent: 0 },
				});

				const result = await node.execute.call(mockExecuteFunction);

				expect(result[0][0].json.classification).toEqual({
					category: 'Billing',
					confidence: 0,
					scores: { Billing: 0, Urgent: 0 },
				});
			});

			it('refuses a category named after the key the scores use', async () => {
				withCategories([{ category: 'confidence', description: 'clashes' }]);
				(processItem as Mock).mockResolvedValue({ matched: [], fallback: false });

				await expect(node.execute.call(mockExecuteFunction)).rejects.toThrow(
					'The category name "confidence" is reserved when confidence scores are on',
				);
			});

			it('allows that category while the option is off', async () => {
				mockExecuteFunction.getNodeParameter.mockImplementation(
					(param, _itemIndex, defaultValue) => {
						if (param === 'inputText') return 'Test input';
						if (param === 'categories.categories')
							return [{ category: 'confidence', description: 'clashes' }];
						return defaultValue;
					},
				);
				(processItem as Mock).mockResolvedValue({ matched: ['confidence'], fallback: false });

				await expect(node.execute.call(mockExecuteFunction)).resolves.toHaveLength(1);
			});
		});

		it('should throw error when continueOnFail is false', async () => {
			mockExecuteFunction.continueOnFail.mockReturnValue(false);
			(processItem as Mock).mockRejectedValue(new Error('Test error'));

			await expect(node.execute.call(mockExecuteFunction)).rejects.toThrow('Test error');
		});

		it('should continue on failure when configured', async () => {
			mockExecuteFunction.continueOnFail.mockReturnValue(true);
			(processItem as Mock).mockRejectedValue(new Error('Test error'));

			const result = await node.execute.call(mockExecuteFunction);

			expect(result).toEqual([[{ json: { error: 'Test error' }, pairedItem: { item: 0 } }]]);
		});

		it('should not expose raw model output in parser error messages', async () => {
			const rawModelOutput = 'customer payload in classifier output';
			mockExecuteFunction.continueOnFail.mockReturnValue(true);
			(processItem as Mock).mockRejectedValue(
				new Error(`Failed to parse. Text: "${rawModelOutput}"`),
			);

			const result = await node.execute.call(mockExecuteFunction);

			expect(result).toEqual([
				[
					{
						json: { error: "Model output doesn't fit required format" },
						pairedItem: { item: 0 },
					},
				],
			]);
			expect(result[0][0].json.error).not.toContain(rawModelOutput);
		});
	});
});
