import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import get from 'lodash/get';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { makeZodSchemaFromAttributes } from '../helpers';
import { InformationExtractor } from '../InformationExtractor.node';
import type { AttributeDefinition } from '../types';

const mockPersonAttributes: AttributeDefinition[] = [
	{
		name: 'name',
		type: 'string',
		description: 'The name of the person',
		required: false,
	},
	{
		name: 'age',
		type: 'number',
		description: 'The age of the person',
		required: false,
	},
];

const mockPersonAttributesRequired: AttributeDefinition[] = [
	{
		name: 'name',
		type: 'string',
		description: 'The name of the person',
		required: true,
	},
	{
		name: 'age',
		type: 'number',
		description: 'The age of the person',
		required: true,
	},
];

function formatFakeLlmResponse(object: Record<string, any>) {
	return `\`\`\`json\n${JSON.stringify(object, null, 2)}\n\`\`\``;
}

const createExecuteFunctionsMock = (
	parameters: IDataObject,
	fakeLlm: BaseLanguageModel,
	inputData = [{ json: {} }],
) => {
	const nodeParameters = parameters;

	return {
		getNodeParameter(parameter: string) {
			return get(nodeParameters, parameter);
		},
		getNode() {
			return {
				typeVersion: 1.1,
			};
		},
		getInputConnectionData() {
			return fakeLlm;
		},
		getInputData() {
			return inputData;
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
	} as unknown as IExecuteFunctions;
};

describe('InformationExtractor', () => {
	describe('Schema Generation', () => {
		it('should generate a schema from attribute descriptions with optional fields', async () => {
			const schema = makeZodSchemaFromAttributes(mockPersonAttributes);

			expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
			expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' });
			expect(schema.parse({ age: 30 })).toEqual({ age: 30 });
		});
	});

	describe('Batch Processing', () => {
		it('should process multiple items in batches', async () => {
			const node = new InformationExtractor();
			const inputData = [
				{ json: { text: 'John is 30 years old' } },
				{ json: { text: 'Alice is 25 years old' } },
				{ json: { text: 'Bob is 40 years old' } },
			];

			const response = await node.execute.call(
				createExecuteFunctionsMock(
					{
						text: 'John is 30 years old',
						attributes: {
							attributes: mockPersonAttributes,
						},
						options: {
							batching: {
								batchSize: 2,
								delayBetweenBatches: 0,
							},
						},
						schemaType: 'fromAttributes',
					},
					new FakeListChatModel({
						responses: [
							formatFakeLlmResponse({ name: 'John', age: 30 }),
							formatFakeLlmResponse({ name: 'Alice', age: 25 }),
							formatFakeLlmResponse({ name: 'Bob', age: 40 }),
						],
					}),
					inputData,
				),
			);

			expect(response).toEqual([
				[
					{ json: { output: { name: 'John', age: 30 } } },
					{ json: { output: { name: 'Alice', age: 25 } } },
					{ json: { output: { name: 'Bob', age: 40 } } },
				],
			]);
		});

		it('should handle errors in batch processing', async () => {
			const node = new InformationExtractor();
			const inputData = [
				{ json: { text: 'John is 30 years old' } },
				{ json: { text: 'Invalid text' } },
				{ json: { text: 'Bob is 40 years old' } },
			];

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					text: 'John is 30 years old',
					attributes: {
						attributes: mockPersonAttributesRequired,
					},
					options: {
						batching: {
							batchSize: 2,
							delayBetweenBatches: 0,
						},
					},
					schemaType: 'fromAttributes',
				},
				new FakeListChatModel({
					responses: [
						formatFakeLlmResponse({ name: 'John', age: 30 }),
						formatFakeLlmResponse({ name: 'Invalid' }), // Missing required age
						formatFakeLlmResponse({ name: 'Invalid' }), // Missing required age on retry
						formatFakeLlmResponse({ name: 'Bob', age: 40 }),
					],
				}),
				inputData,
			);

			mockExecuteFunctions.continueOnFail = () => true;

			const response = await node.execute.call(mockExecuteFunctions);

			expect(response[0]).toHaveLength(3);
			expect(response[0][0]).toEqual({ json: { output: { name: 'John', age: 30 } } });
			expect(response[0][1]).toEqual({
				json: { error: expect.stringContaining('Failed to parse') },
				pairedItem: { item: 1 },
			});
			expect(response[0][2]).toEqual({ json: { output: { name: 'Bob', age: 40 } } });
		});

		it('should throw error if batch processing fails and continueOnFail is false', async () => {
			const node = new InformationExtractor();
			const inputData = [
				{ json: { text: 'John is 30 years old' } },
				{ json: { text: 'Invalid text' } },
				{ json: { text: 'Bob is 40 years old' } },
			];

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					text: 'John is 30 years old',
					attributes: {
						attributes: mockPersonAttributesRequired,
					},
					options: {
						batching: {
							batchSize: 2,
							delayBetweenBatches: 0,
						},
					},
					schemaType: 'fromAttributes',
				},
				new FakeListChatModel({
					responses: [
						formatFakeLlmResponse({ name: 'John', age: 30 }),
						formatFakeLlmResponse({ name: 'Invalid' }), // Missing required age
						formatFakeLlmResponse({ name: 'Invalid' }), // Missing required age on retry
						formatFakeLlmResponse({ name: 'Bob', age: 40 }),
					],
				}),
				inputData,
			);

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('Failed to parse');
		});
	});
});
