import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { FakeLLM, FakeListChatModel } from '@langchain/core/utils/testing';
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

const createExecuteFunctionsMock = (parameters: IDataObject, fakeLlm: BaseLanguageModel) => {
	const nodeParameters = parameters;

	return {
		getNodeParameter(parameter: string) {
			return get(nodeParameters, parameter);
		},
		getNode() {
			return {};
		},
		getInputConnectionData() {
			return fakeLlm;
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
	} as unknown as IExecuteFunctions;
};

describe('InformationExtractor', () => {
	describe('From Attribute Descriptions', () => {
		it('should generate a schema from attribute descriptions with optional fields', async () => {
			const schema = makeZodSchemaFromAttributes(mockPersonAttributes);

			expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
			expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' });
			expect(schema.parse({ age: 30 })).toEqual({ age: 30 });
		});

		it('should make a request to LLM and return the extracted attributes', async () => {
			const node = new InformationExtractor();

			const response = await node.execute.call(
				createExecuteFunctionsMock(
					{
						text: 'John is 30 years old',
						attributes: {
							attributes: mockPersonAttributes,
						},
						options: {},
						schemaType: 'fromAttributes',
					},
					new FakeLLM({ response: formatFakeLlmResponse({ name: 'John', age: 30 }) }),
				),
			);

			expect(response).toEqual([[{ json: { output: { name: 'John', age: 30 } } }]]);
		});

		it('should not fail if LLM could not extract some attribute', async () => {
			const node = new InformationExtractor();

			const response = await node.execute.call(
				createExecuteFunctionsMock(
					{
						text: 'John is 30 years old',
						attributes: {
							attributes: mockPersonAttributes,
						},
						options: {},
						schemaType: 'fromAttributes',
					},
					new FakeLLM({ response: formatFakeLlmResponse({ name: 'John' }) }),
				),
			);

			expect(response).toEqual([[{ json: { output: { name: 'John' } } }]]);
		});

		it('should fail if LLM could not extract some required attribute', async () => {
			const node = new InformationExtractor();

			try {
				await node.execute.call(
					createExecuteFunctionsMock(
						{
							text: 'John is 30 years old',
							attributes: {
								attributes: mockPersonAttributesRequired,
							},
							options: {},
							schemaType: 'fromAttributes',
						},
						new FakeLLM({ response: formatFakeLlmResponse({ name: 'John' }) }),
					),
				);
			} catch (error) {
				expect(error.message).toContain('Failed to parse');
			}
		});

		it('should fail if LLM extracted an attribute with the wrong type', async () => {
			const node = new InformationExtractor();

			try {
				await node.execute.call(
					createExecuteFunctionsMock(
						{
							text: 'John is 30 years old',
							attributes: {
								attributes: mockPersonAttributes,
							},
							options: {},
							schemaType: 'fromAttributes',
						},
						new FakeLLM({ response: formatFakeLlmResponse({ name: 'John', age: '30' }) }),
					),
				);
			} catch (error) {
				expect(error.message).toContain('Failed to parse');
			}
		});

		it('retries if LLM fails to extract some required attribute', async () => {
			const node = new InformationExtractor();

			const response = await node.execute.call(
				createExecuteFunctionsMock(
					{
						text: 'John is 30 years old',
						attributes: {
							attributes: mockPersonAttributesRequired,
						},
						options: {},
						schemaType: 'fromAttributes',
					},
					new FakeListChatModel({
						responses: [
							formatFakeLlmResponse({ name: 'John' }),
							formatFakeLlmResponse({ name: 'John', age: 30 }),
						],
					}),
				),
			);

			expect(response).toEqual([[{ json: { output: { name: 'John', age: 30 } } }]]);
		});

		it('retries if LLM extracted an attribute with a wrong type', async () => {
			const node = new InformationExtractor();

			const response = await node.execute.call(
				createExecuteFunctionsMock(
					{
						text: 'John is 30 years old',
						attributes: {
							attributes: mockPersonAttributesRequired,
						},
						options: {},
						schemaType: 'fromAttributes',
					},
					new FakeListChatModel({
						responses: [
							formatFakeLlmResponse({ name: 'John', age: '30' }),
							formatFakeLlmResponse({ name: 'John', age: 30 }),
						],
					}),
				),
			);

			expect(response).toEqual([[{ json: { output: { name: 'John', age: 30 } } }]]);
		});
	});
});
