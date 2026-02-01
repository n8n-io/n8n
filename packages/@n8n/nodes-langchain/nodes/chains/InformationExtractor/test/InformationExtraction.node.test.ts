import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import get from 'lodash/get';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';

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

	describe('Single Item Processing with JSON Schema from Example', () => {
		it('should extract information using JSON schema from example - version 1.2 (required fields)', async () => {
			const node = new InformationExtractor();
			const inputData = [
				{
					json: { text: 'John lives in California and has visited Los Angeles and San Francisco' },
				},
			];

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					text: 'John lives in California and has visited Los Angeles and San Francisco',
					schemaType: 'fromJson',
					jsonSchemaExample: JSON.stringify({
						state: 'California',
						cities: ['Los Angeles', 'San Francisco'],
					}),
					options: {
						systemPromptTemplate: '',
					},
				},
				new FakeListChatModel({
					responses: [
						formatFakeLlmResponse({
							state: 'California',
							cities: ['Los Angeles', 'San Francisco'],
						}),
					],
				}),
				inputData,
			);

			// Mock version 1.2 to test required fields behavior
			mockExecuteFunctions.getNode = () => mock<INode>({ typeVersion: 1.2 });

			const response = await node.execute.call(mockExecuteFunctions);

			expect(response).toEqual([
				[
					{
						json: {
							output: {
								state: 'California',
								cities: ['Los Angeles', 'San Francisco'],
							},
						},
					},
				],
			]);
		});

		it('should extract information using JSON schema from example - version 1.1 (optional fields)', async () => {
			const node = new InformationExtractor();
			const inputData = [{ json: { text: 'John lives in California' } }];

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					text: 'John lives in California',
					schemaType: 'fromJson',
					jsonSchemaExample: JSON.stringify({
						state: 'California',
						cities: ['Los Angeles', 'San Francisco'],
					}),
					options: {
						systemPromptTemplate: '',
					},
				},
				new FakeListChatModel({
					responses: [
						formatFakeLlmResponse({
							state: 'California',
							// cities field missing - should be allowed in v1.1
						}),
					],
				}),
				inputData,
			);

			// Mock version 1.1 to test optional fields behavior
			mockExecuteFunctions.getNode = () => mock<INode>({ typeVersion: 1.1 });

			const response = await node.execute.call(mockExecuteFunctions);

			expect(response).toEqual([
				[
					{
						json: {
							output: {
								state: 'California',
							},
						},
					},
				],
			]);
		});

		it('should throw error for incomplete model output in version 1.2 (required fields)', async () => {
			const node = new InformationExtractor();
			const inputData = [{ json: { text: 'John lives in California' } }];

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					text: 'John lives in California',
					schemaType: 'fromJson',
					jsonSchemaExample: JSON.stringify({
						state: 'California',
						cities: ['Los Angeles', 'San Francisco'],
						zipCode: '90210',
					}),
					options: {
						systemPromptTemplate: '',
					},
				},
				new FakeListChatModel({
					responses: [
						formatFakeLlmResponse({
							state: 'California',
							// Missing cities and zipCode - should fail in v1.2 since all fields are required
						}),
					],
				}),
				inputData,
			);

			mockExecuteFunctions.getNode = () => mock<INode>({ typeVersion: 1.2 });

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();
		});

		it('should extract information using complex nested JSON schema from example', async () => {
			const node = new InformationExtractor();
			const inputData = [
				{
					json: {
						text: 'John Doe works at Acme Corp as a Software Engineer with 5 years experience',
					},
				},
			];

			const complexSchema = {
				person: {
					name: 'John Doe',
					company: {
						name: 'Acme Corp',
						position: 'Software Engineer',
					},
				},
				experience: {
					years: 5,
					skills: ['JavaScript', 'TypeScript'],
				},
			};

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					text: 'John Doe works at Acme Corp as a Software Engineer with 5 years experience',
					schemaType: 'fromJson',
					jsonSchemaExample: JSON.stringify(complexSchema),
					options: {
						systemPromptTemplate: '',
					},
				},
				new FakeListChatModel({
					responses: [
						formatFakeLlmResponse({
							person: {
								name: 'John Doe',
								company: {
									name: 'Acme Corp',
									position: 'Software Engineer',
								},
							},
							experience: {
								years: 5,
								skills: ['JavaScript', 'TypeScript'],
							},
						}),
					],
				}),
				inputData,
			);

			mockExecuteFunctions.getNode = () => mock<INode>({ typeVersion: 1.2 });

			const response = await node.execute.call(mockExecuteFunctions);

			expect(response[0][0].json.output).toMatchObject({
				person: {
					name: 'John Doe',
					company: {
						name: 'Acme Corp',
						position: 'Software Engineer',
					},
				},
				experience: {
					years: 5,
					skills: expect.arrayContaining(['JavaScript', 'TypeScript']),
				},
			});
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
