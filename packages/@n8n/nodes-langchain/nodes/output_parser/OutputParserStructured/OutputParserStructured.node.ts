import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
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

import {
	buildJsonSchemaExampleNotice,
	inputSchemaField,
	jsonSchemaExampleField,
	schemaTypeField,
} from '@utils/descriptions';
import {
	N8nOutputFixingParser,
	N8nStructuredOutputParser,
} from '@utils/output_parsers/N8nOutputParser';
import { convertJsonSchemaToZod, generateSchemaFromExample } from '@utils/schemaParsing';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { NAIVE_FIX_PROMPT } from './prompt';

export class OutputParserStructured implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Structured Output Parser',
		name: 'outputParserStructured',
		icon: 'fa:code',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		defaultVersion: 1.3,
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
		inputs: `={{
			((parameters) => {
				if (parameters?.autoFix) {
					return [
						{ displayName: 'Model', maxConnections: 1, type: "${NodeConnectionTypes.AiLanguageModel}", required: true }
					];
				}

				return [];
			})($parameter)
		}}`,

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
			buildJsonSchemaExampleNotice({
				showExtraProps: {
					'@version': [{ _cnd: { gte: 1.3 } }],
				},
			}),
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
				displayName: 'Auto-Fix Format',
				description:
					'Whether to automatically fix the output when it is not in the correct format. Will cause another LLM call.',
				name: 'autoFix',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Customize Retry Prompt',
				name: 'customizeRetryPrompt',
				type: 'boolean',
				displayOptions: {
					show: {
						autoFix: [true],
					},
				},
				default: false,
				description:
					'Whether to customize the prompt used for retrying the output parsing. If disabled, a default prompt will be used.',
			},
			{
				displayName: 'Custom Prompt',
				name: 'prompt',
				type: 'string',
				displayOptions: {
					show: {
						autoFix: [true],
						customizeRetryPrompt: [true],
					},
				},
				default: NAIVE_FIX_PROMPT,
				typeOptions: {
					rows: 10,
				},
				hint: 'Should include "{error}", "{instructions}", and "{completion}" placeholders',
				description:
					'Prompt template used for fixing the output. Uses placeholders: "{instructions}" for parsing rules, "{completion}" for the failed attempt, and "{error}" for the validation error message.',
			},
		],
		hints: [
			{
				message:
					'Fields that use $refs might have the wrong type, since this syntax is not currently supported',
				type: 'warning',
				location: 'outputPane',
				whenToDisplay: 'afterExecution',
				displayCondition:
					'={{ $parameter["schemaType"] === "manual" && $parameter["inputSchema"]?.includes("$ref") }}',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const schemaType = this.getNodeParameter('schemaType', itemIndex, '') as 'fromJson' | 'manual';
		// We initialize these even though one of them will always be empty
		// it makes it easer to navigate the ternary operator
		const jsonExample = this.getNodeParameter('jsonSchemaExample', itemIndex, '') as string;

		let inputSchema: string;

		// Enforce all fields to be required in the generated schema if the node version is 1.3 or higher
		const jsonExampleAllFieldsRequired = this.getNode().typeVersion >= 1.3;

		if (this.getNode().typeVersion <= 1.1) {
			inputSchema = this.getNodeParameter('jsonSchema', itemIndex, '') as string;
		} else {
			inputSchema = this.getNodeParameter('inputSchema', itemIndex, '') as string;
		}

		const jsonSchema =
			schemaType === 'fromJson'
				? generateSchemaFromExample(jsonExample, jsonExampleAllFieldsRequired)
				: jsonParse<JSONSchema7>(inputSchema);

		const zodSchema = convertJsonSchemaToZod<z.ZodSchema<object>>(jsonSchema);
		const nodeVersion = this.getNode().typeVersion;

		const autoFix = this.getNodeParameter('autoFix', itemIndex, false) as boolean;

		let outputParser;
		try {
			outputParser = await N8nStructuredOutputParser.fromZodJsonSchema(
				zodSchema,
				nodeVersion,
				this,
			);
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				'Error during parsing of JSON Schema. Please check the schema and try again.',
			);
		}

		if (!autoFix) {
			return {
				response: outputParser,
			};
		}

		const model = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;

		const prompt = this.getNodeParameter('prompt', itemIndex, NAIVE_FIX_PROMPT) as string;

		if (prompt.length === 0 || !prompt.includes('{error}')) {
			throw new NodeOperationError(
				this.getNode(),
				'Auto-fixing parser prompt has to contain {error} placeholder',
			);
		}
		const parser = new N8nOutputFixingParser(
			this,
			model,
			outputParser,
			PromptTemplate.fromTemplate(prompt),
		);

		return {
			response: parser,
		};
	}
}
