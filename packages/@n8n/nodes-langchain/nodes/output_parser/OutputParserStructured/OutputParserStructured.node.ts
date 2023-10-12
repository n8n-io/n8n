/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	jsonParse,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

import { parseSchema } from 'json-schema-to-zod';
import { z } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { OutputParserException } from 'langchain/schema/output_parser';
import get from 'lodash/get';
import { logWrapper } from '../../../utils/logWrapper';

const STRUCTURED_OUTPUT_KEY = '__structured__output';
const STRUCTURED_OUTPUT_OBJECT_KEY = '__structured__output__object';
const STRUCTURED_OUTPUT_ARRAY_KEY = '__structured__output__array';

class N8nStructuredOutputParser<T extends z.ZodTypeAny> extends StructuredOutputParser<T> {
	async parse(text: string): Promise<z.infer<T>> {
		try {
			const parsed = (await super.parse(text)) as object;

			return (
				get(parsed, `${STRUCTURED_OUTPUT_KEY}.${STRUCTURED_OUTPUT_OBJECT_KEY}`) ??
				get(parsed, `${STRUCTURED_OUTPUT_KEY}.${STRUCTURED_OUTPUT_ARRAY_KEY}`) ??
				get(parsed, STRUCTURED_OUTPUT_KEY) ??
				parsed
			);
		} catch (e) {
			// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
			throw new OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`, text);
		}
	}

	static fromZedJsonSchema(
		schema: JSONSchema7,
	): StructuredOutputParser<z.ZodType<object, z.ZodTypeDef, object>> {
		// Make sure to remove the description from root schema
		const { description, ...restOfSchema } = schema;

		// We want to wrap the schema in a way that it can be used for both object and array
		// outputs and allows us to parse and display them correctly
		const returnSchema = {
			type: 'object',
			properties: {
				[STRUCTURED_OUTPUT_KEY]: {
					type: 'object',
					properties: {
						[STRUCTURED_OUTPUT_OBJECT_KEY]: {
							type: 'object',
							description:
								'Use this wrapper when you have a single data entry that conforms to the itemSchema. Ideal for object-like outputs representing a singular entity. Example: { foo: "bar", foo2: ["bar2", "bar3"] }',
							...restOfSchema,
						},
						[STRUCTURED_OUTPUT_ARRAY_KEY]: {
							type: 'array',
							description:
								'Use this wrapper when you have multiple data entries, each conforming to the itemSchema. Ideal for array-like outputs representing a list of entities. Example: [ { foo: "bar", cities: ["foo1", "foo2"] }, ... ]',
							items: schema,
						},
					},
				},
			},
		};

		const zodSchemaString = parseSchema(returnSchema as JSONSchema7);

		// TODO: This is obviously not great and should be replaced later!!!
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const zodSchema = new Function('z', `return (${zodSchemaString})`)(z) as z.ZodSchema<object>;

		return N8nStructuredOutputParser.fromZodSchema(zodSchema);
	}
}
export class OutputParserStructured implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Structured Output Parser',
		name: 'outputParserStructured',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'Return data in a defined JSON format',
		defaults: {
			name: 'Structured Output Parser',
		},

		codex: {
			alias: ['json', 'zod'],
			categories: ['AI'],
			subcategories: {
				AI: ['Output Parsers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserstructured/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiOutputParser],
		outputNames: ['Output Parser'],
		properties: [
			{
				displayName: 'JSON Schema',
				name: 'jsonSchema',
				type: 'json',
				description: 'JSON Schema to structure and validate the output against',
				default: `{
  "type": "object",
  "properties": {
    "state": {
      "type": "string"
    },
    "cities": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  }
}`,
				typeOptions: {
					rows: 10,
					editor: 'json',
					editorLanguage: 'json',
				},
				required: true,
			},
			{
				displayName:
					'The schema has to be defined in the <a target="_blank" href="https://json-schema.org/">JSON Schema</a> format. Look at <a target="_blank" href="https://json-schema.org/learn/miscellaneous-examples.html">this</a> page for examples.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const schema = this.getNodeParameter('jsonSchema', itemIndex) as string;

		let itemSchema: JSONSchema7;
		try {
			itemSchema = jsonParse<JSONSchema7>(schema);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Error during parsing of JSON Schema.');
		}

		const parser = N8nStructuredOutputParser.fromZedJsonSchema(itemSchema);

		return {
			response: logWrapper(parser, this),
		};
	}
}
