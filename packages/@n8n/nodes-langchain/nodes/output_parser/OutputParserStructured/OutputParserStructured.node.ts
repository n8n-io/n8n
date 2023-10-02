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

import { StructuredOutputParser } from 'langchain/output_parsers';
import { parseSchema } from 'json-schema-to-zod';
import { z } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import { logWrapper } from '../../../utils/logWrapper';

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

		let itemSchema: object;
		try {
			itemSchema = jsonParse(schema);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Error during parsing of JSON Schema.');
		}

		// As we always want to return an array wrap it accordingly
		const returnSchema: JSONSchema7 = {
			type: 'array',
			items: itemSchema,
		};

		const zodSchemaString = parseSchema(returnSchema);

		// TODO: This is obviously not great and should be replaced later!!!
		// const createZodSchema = new Function('z', `return (${zodSchemaString})`);
		// const zodSchema = createZodSchema(z);
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const zodSchema = new Function('z', `return (${zodSchemaString})`)(z) as z.ZodSchema<object>;

		const parser = StructuredOutputParser.fromZodSchema(zodSchema);

		return {
			response: logWrapper(parser, this),
		};
	}
}
