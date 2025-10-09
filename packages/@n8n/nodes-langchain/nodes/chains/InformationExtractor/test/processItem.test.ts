import { FakeLLM, FakeListChatModel } from '@langchain/core/utils/testing';
import { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';
import { NodeOperationError } from 'n8n-workflow';

import { makeZodSchemaFromAttributes } from '../helpers';
import { processItem } from '../processItem';
import type { AttributeDefinition } from '../types';

jest.mock('@utils/tracing', () => ({
	getTracingConfig: () => ({}),
}));

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

describe('processItem', () => {
	it('should process a single item and return extracted attributes', async () => {
		const mockExecuteFunctions = {
			getNodeParameter: (param: string) => {
				if (param === 'text') return 'John is 30 years old';
				if (param === 'options') return {};
				return undefined;
			},
			getNode: () => ({ typeVersion: 1.1 }),
		};

		const llm = new FakeLLM({ response: formatFakeLlmResponse({ name: 'John', age: 30 }) });
		const parser = OutputFixingParser.fromLLM(
			llm,
			StructuredOutputParser.fromZodSchema(makeZodSchemaFromAttributes(mockPersonAttributes)),
		);

		const result = await processItem(mockExecuteFunctions as any, 0, llm, parser);

		expect(result).toEqual({ name: 'John', age: 30 });
	});

	it('should throw error if input is undefined or empty', async () => {
		const mockExecuteFunctions = {
			getNodeParameter: (param: string, itemIndex: number) => {
				if (param === 'text') {
					if (itemIndex === 0) return undefined;
					if (itemIndex === 1) return '';
					if (itemIndex === 2) return ' ';
					return null;
				}
				if (param === 'options') return {};
				return undefined;
			},
			getNode: () => ({ typeVersion: 1.1 }),
		};

		const llm = new FakeLLM({ response: formatFakeLlmResponse({ name: 'John', age: 30 }) });
		const parser = OutputFixingParser.fromLLM(
			llm,
			StructuredOutputParser.fromZodSchema(makeZodSchemaFromAttributes(mockPersonAttributes)),
		);

		for (let itemIndex = 0; itemIndex < 4; itemIndex++) {
			await expect(
				processItem(mockExecuteFunctions as any, itemIndex, llm, parser),
			).rejects.toThrow(NodeOperationError);
		}
	});

	it('should use custom system prompt template if provided', async () => {
		const customTemplate = 'Custom template {format_instructions}';
		const mockExecuteFunctions = {
			getNodeParameter: (param: string) => {
				if (param === 'text') return 'John is 30 years old';
				if (param === 'options') return { systemPromptTemplate: customTemplate };
				return undefined;
			},
			getNode: () => ({ typeVersion: 1.1 }),
		};

		const llm = new FakeLLM({ response: formatFakeLlmResponse({ name: 'John', age: 30 }) });
		const parser = OutputFixingParser.fromLLM(
			llm,
			StructuredOutputParser.fromZodSchema(makeZodSchemaFromAttributes(mockPersonAttributes)),
		);

		const result = await processItem(mockExecuteFunctions as any, 0, llm, parser);

		expect(result).toEqual({ name: 'John', age: 30 });
	});

	it('should handle retries when LLM returns invalid data', async () => {
		const mockExecuteFunctions = {
			getNodeParameter: (param: string) => {
				if (param === 'text') return 'John is 30 years old';
				if (param === 'options') return {};
				return undefined;
			},
			getNode: () => ({ typeVersion: 1.1 }),
		};

		const llm = new FakeListChatModel({
			responses: [
				formatFakeLlmResponse({ name: 'John', age: '30' }), // Wrong type
				formatFakeLlmResponse({ name: 'John', age: 30 }), // Correct type
			],
		});
		const parser = OutputFixingParser.fromLLM(
			llm,
			StructuredOutputParser.fromZodSchema(
				makeZodSchemaFromAttributes(mockPersonAttributesRequired),
			),
		);

		const result = await processItem(mockExecuteFunctions as any, 0, llm, parser);

		expect(result).toEqual({ name: 'John', age: 30 });
	});
});
