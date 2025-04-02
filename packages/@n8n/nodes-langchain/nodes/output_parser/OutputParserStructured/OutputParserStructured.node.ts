import type { JSONSchema7 } from 'json-schema';
import {
	jsonParse,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	NodeOperationError,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type { z } from 'zod';

import { inputSchemaField, jsonSchemaExampleField, schemaTypeField } from '@utils/descriptions';
import { N8nStructuredOutputParser } from '@utils/output_parsers/N8nOutputParser';
import { convertJsonSchemaToZod, generateSchema } from '@utils/schemaParsing';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class OutputParserStructured implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Structured Output Parser',
		name: 'outputParserStructured',
		icon: 'fa:code',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2],
		defaultVersion: 1.2,
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
		outputs: [NodeConnectionTypes.AiOutputParser],
		outputNames: ['Output Parser'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{ ...schemaTypeField, displayOptions: { show: { '@version': [{ _cnd: { gte: 1.2 } }] } } },
			{
				...jsonSchemaExampleField,
				default: `{
	"state": "California",
	"cities": ["Los Angeles", "San Francisco", "San Diego"]
}`,
			},
			{
				...inputSchemaField,
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
			},
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
				},
				required: true,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lte: 1.1 } }],
					},
				},
			},
			{
				displayName:
					'The schema has to be defined in the <a target="_blank" href="https://json-schema.org/">JSON Schema</a> format. Look at <a target="_blank" href="https://json-schema.org/learn/miscellaneous-examples.html">this</a> page for examples.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					hide: {
						schemaType: ['fromJson'],
					},
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const schemaType = this.getNodeParameter('schemaType', itemIndex, '') as 'fromJson' | 'manual';
		// We initialize these even though one of them will always be empty
		// it makes it easer to navigate the ternary operator
		const jsonExample = this.getNodeParameter('jsonSchemaExample', itemIndex, '') as string;
		let inputSchema: string;

		if (this.getNode().typeVersion <= 1.1) {
			inputSchema = this.getNodeParameter('jsonSchema', itemIndex, '') as string;
		} else {
			inputSchema = this.getNodeParameter('inputSchema', itemIndex, '') as string;
		}

		const jsonSchema =
			schemaType === 'fromJson' ? generateSchema(jsonExample) : jsonParse<JSONSchema7>(inputSchema);

		const zodSchema = convertJsonSchemaToZod<z.ZodSchema<object>>(jsonSchema);
		const nodeVersion = this.getNode().typeVersion;
		try {
			const parser = await N8nStructuredOutputParser.fromZodJsonSchema(
				zodSchema,
				nodeVersion,
				this,
			);
			return {
				response: parser,
			};
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Error during parsing of JSON Schema.');
		}
	}
}
