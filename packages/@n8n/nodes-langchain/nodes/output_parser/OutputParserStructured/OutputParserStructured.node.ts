import type { JSONSchema7 } from 'json-schema';
import { StructuredOutputParser } from 'langchain/output_parsers';
import get from 'lodash/get';
import {
	jsonParse,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';
import { z } from 'zod';

import {
	inputSchemaField,
	jsonSchemaExampleField,
	schemaTypeField,
} from '../../../utils/descriptions';
import { logWrapper } from '../../../utils/logWrapper';
import { generateSchema, getSandboxWithZod } from '../../../utils/schemaParsing';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { logAiEvent } from '../../../utils/helpers';

const STRUCTURED_OUTPUT_KEY = '__structured__output';
const STRUCTURED_OUTPUT_OBJECT_KEY = '__structured__output__object';
const STRUCTURED_OUTPUT_ARRAY_KEY = '__structured__output__array';

export class N8nStructuredOutputParser<T extends z.ZodTypeAny> extends StructuredOutputParser<T> {
	context: IExecuteFunctions;

	constructor(context: IExecuteFunctions, zodSchema: T) {
		super(zodSchema);
		this.context = context;
	}

	async parse(text: string, errorMapper?: (error: Error) => Error): Promise<object> {
		// connectionType = NodeConnectionType.AiOutputParser;
		// const stringifiedText = isObject(text) ? JSON.stringify(text) : text;
		const { index } = this.context.addInputData(NodeConnectionType.AiOutputParser, [
			[{ json: { action: 'parse', text } }],
		]);
		try {
			const parsed = (await super.parse(text)) as object;

			const result = (get(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_OBJECT_KEY]) ??
				get(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_ARRAY_KEY]) ??
				get(parsed, STRUCTURED_OUTPUT_KEY) ??
				parsed) as Record<string, unknown>;

			void logAiEvent(this.context, 'ai-output-parsed', { text, response: result });

			this.context.addOutputData(NodeConnectionType.AiOutputParser, index, [
				[{ json: { action: 'parse', response: result } }],
			]);

			return result;
		} catch (e) {
			const nodeError = new NodeOperationError(
				this.context.getNode(),
				"Model output doesn't fit required format",
				{
					description:
						"To continue the execution when this happens, change the 'On Error' parameter in the root node's settings",
				},
			);

			void logAiEvent(this.context, 'ai-output-parsed', {
				text,
				response: e.message ?? e,
			});

			this.context.addOutputData(NodeConnectionType.AiOutputParser, index, nodeError);
			if (errorMapper) {
				throw errorMapper(e);
			}

			throw nodeError;
		}
	}

	async fromZedJsonSchema(
		zodSchema: z.ZodSchema<object>,
		nodeVersion: number,
	): Promise<StructuredOutputParser<z.ZodType<object, z.ZodTypeDef, object>>> {
		let returnSchema: z.ZodSchema<object>;
		if (nodeVersion === 1) {
			returnSchema = z.object({
				[STRUCTURED_OUTPUT_KEY]: z
					.object({
						[STRUCTURED_OUTPUT_OBJECT_KEY]: zodSchema.optional(),
						[STRUCTURED_OUTPUT_ARRAY_KEY]: z.array(zodSchema).optional(),
					})
					.describe(
						`Wrapper around the output data. It can only contain ${STRUCTURED_OUTPUT_OBJECT_KEY} or ${STRUCTURED_OUTPUT_ARRAY_KEY} but never both.`,
					)
					.refine(
						(data) => {
							// Validate that one and only one of the properties exists
							return (
								Boolean(data[STRUCTURED_OUTPUT_OBJECT_KEY]) !==
								Boolean(data[STRUCTURED_OUTPUT_ARRAY_KEY])
							);
						},
						{
							message:
								'One and only one of __structured__output__object and __structured__output__array should be present.',
							path: [STRUCTURED_OUTPUT_KEY],
						},
					),
			});
		} else {
			returnSchema = z.object({
				output: zodSchema.optional(),
			});
		}

		return this;
	}
}
export class OutputParserStructured implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Structured Output Parser',
		name: 'outputParserStructured',
		icon: 'fa:code',
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
		outputs: [NodeConnectionType.AiOutputParser],
		outputNames: ['Output Parser'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiAgent]),
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

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
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

		const zodSchemaSandbox = getSandboxWithZod(this, jsonSchema, 0);
		const nodeVersion = this.getNode().typeVersion;
		try {
			const zodSchema = (await zodSchemaSandbox.runCode()) as z.ZodSchema<object>;
			const parserInstance = new N8nStructuredOutputParser(this, zodSchema);
			const parser = await parserInstance.fromZedJsonSchema(zodSchema, nodeVersion);

			return {
				response: logWrapper(parser, this),
			};
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Error during parsing of JSON Schema.');
		}
	}
}
