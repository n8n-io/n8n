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
import { z } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { OutputParserException } from '@langchain/core/output_parsers';
import get from 'lodash/get';
import { getSandboxContext } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import { JavaScriptSandbox } from 'n8n-nodes-base/dist/nodes/Code/JavaScriptSandbox';
import { makeResolverFromLegacyOptions } from '@n8n/vm2';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { logWrapper } from '../../../utils/logWrapper';

const STRUCTURED_OUTPUT_KEY = '__structured__output';
const STRUCTURED_OUTPUT_OBJECT_KEY = '__structured__output__object';
const STRUCTURED_OUTPUT_ARRAY_KEY = '__structured__output__array';

export class N8nStructuredOutputParser<T extends z.ZodTypeAny> extends StructuredOutputParser<T> {
	async parse(text: string): Promise<z.infer<T>> {
		try {
			const parsed = (await super.parse(text)) as object;

			return (
				get(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_OBJECT_KEY]) ??
				get(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_ARRAY_KEY]) ??
				get(parsed, STRUCTURED_OUTPUT_KEY) ??
				parsed
			);
		} catch (e) {
			// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
			throw new OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`, text);
		}
	}

	static async fromZedJsonSchema(
		sandboxedSchema: JavaScriptSandbox,
		nodeVersion: number,
	): Promise<StructuredOutputParser<z.ZodType<object, z.ZodTypeDef, object>>> {
		const zodSchema = (await sandboxedSchema.runCode()) as z.ZodSchema<object>;

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

		return N8nStructuredOutputParser.fromZodSchema(returnSchema);
	}
}
export class OutputParserStructured implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Structured Output Parser',
		name: 'outputParserStructured',
		icon: 'fa:code',
		group: ['transform'],
		version: [1, 1.1],
		defaultVersion: 1.1,
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

			// If the type is not defined, we assume it's an object
			if (itemSchema.type === undefined) {
				itemSchema = {
					type: 'object',
					properties: itemSchema.properties ?? (itemSchema as { [key: string]: JSONSchema7 }),
				};
			}
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Error during parsing of JSON Schema.');
		}

		const vmResolver = makeResolverFromLegacyOptions({
			external: {
				modules: ['json-schema-to-zod', 'zod'],
				transitive: false,
			},
			resolve(moduleName, parentDirname) {
				if (moduleName === 'json-schema-to-zod') {
					return require.resolve(
						'@n8n/n8n-nodes-langchain/node_modules/json-schema-to-zod/dist/cjs/jsonSchemaToZod.js',
						{
							paths: [parentDirname],
						},
					);
				}
				if (moduleName === 'zod') {
					return require.resolve('@n8n/n8n-nodes-langchain/node_modules/zod.cjs', {
						paths: [parentDirname],
					});
				}
				return;
			},
			builtin: [],
		});
		const context = getSandboxContext.call(this, itemIndex);
		// Make sure to remove the description from root schema
		const { description, ...restOfSchema } = itemSchema;
		const sandboxedSchema = new JavaScriptSandbox(
			context,
			`
				const { z } = require('zod');
				const { parseSchema } = require('json-schema-to-zod');
				const zodSchema = parseSchema(${JSON.stringify(restOfSchema)});
				const itemSchema = new Function('z', 'return (' + zodSchema + ')')(z)
				return itemSchema
			`,
			itemIndex,
			this.helpers,
			{ resolver: vmResolver },
		);

		const nodeVersion = this.getNode().typeVersion;
		try {
			const parser = await N8nStructuredOutputParser.fromZedJsonSchema(
				sandboxedSchema,
				nodeVersion,
			);
			return {
				response: logWrapper(parser, this),
			};
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Error during parsing of JSON Schema.');
		}
	}
}
