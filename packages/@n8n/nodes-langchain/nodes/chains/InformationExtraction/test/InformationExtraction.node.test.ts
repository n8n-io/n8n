import type { IDataObject, IExecuteFunctions } from 'n8n-workflow/src';
import get from 'lodash/get';

import { FakeLLM } from '@langchain/core/utils/testing';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { InformationExtraction } from '../InformationExtraction.node';
import { makeZodSchemaFromAttributes } from '../helpers';
import type { AttributeDefinition } from '../types';

const mockPersonAttributes: AttributeDefinition[] = [
	{
		name: 'name',
		type: 'string',
		description: 'The name of the person',
	},
	{
		name: 'age',
		type: 'number',
		description: 'The age of the person',
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
	} as unknown as IExecuteFunctions;
};

describe('InformationExtraction', () => {
	describe('From Attribute Descriptions', () => {
		it('should generate a schema from attribute descriptions', async () => {
			const schema = makeZodSchemaFromAttributes(mockPersonAttributes, true);

			expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
			expect(() => schema.parse({ name: 'John' })).toThrow();
			expect(() => schema.parse({ age: 30 })).toThrow();
		});

		it('should generate a schema from attribute descriptions with optional fields', async () => {
			const schema = makeZodSchemaFromAttributes(mockPersonAttributes, false);

			expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
			expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' });
			expect(schema.parse({ age: 30 })).toEqual({ age: 30 });
		});

		it('should make a request to LLM and return the extracted attributes', async () => {
			const node = new InformationExtraction();

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
			const node = new InformationExtraction();

			const response = await node.execute.call(
				createExecuteFunctionsMock(
					{
						text: 'John is 30 years old',
						attributes: {
							attributes: mockPersonAttributes,
						},
						notFoundStrategy: 'emptyAttribute',
						options: {},
						schemaType: 'fromAttributes',
					},
					new FakeLLM({ response: formatFakeLlmResponse({ name: 'John' }) }),
				),
			);

			expect(response).toEqual([[{ json: { output: { name: 'John' } } }]]);
		});

		it('should fail if LLM could not extract some attribute', async () => {
			const node = new InformationExtraction();

			try {
				await node.execute.call(
					createExecuteFunctionsMock(
						{
							text: 'John is 30 years old',
							attributes: {
								attributes: mockPersonAttributes,
							},
							notFoundStrategy: 'fail',
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
	});
});
