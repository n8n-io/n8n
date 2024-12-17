import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import type { JSONSchema7 } from 'json-schema';
import { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';
import { jsonParse, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
} from 'n8n-workflow';
import type { z } from 'zod';

import { inputSchemaField, jsonSchemaExampleField, schemaTypeField } from '@utils/descriptions';
import { convertJsonSchemaToZod, generateSchema } from '@utils/schemaParsing';
import { getTracingConfig } from '@utils/tracing';

import { makeZodSchemaFromAttributes } from './helpers';
import type { AttributeDefinition } from './types';

const SYSTEM_PROMPT_TEMPLATE = `You are an expert extraction algorithm.
Only extract relevant information from the text.
If you do not know the value of an attribute asked to extract, you may omit the attribute's value.`;

export class InformationExtractor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Information Extractor',
		name: 'informationExtractor',
		icon: 'fa:project-diagram',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Extract information from text in a structured format',
		codex: {
			alias: ['NER', 'parse', 'parsing', 'JSON', 'data extraction', 'structured'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.information-extractor/',
					},
				],
			},
		},
		defaults: {
			name: 'Information Extractor',
		},
		inputs: [
			{ displayName: '', type: NodeConnectionType.Main },
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				required: true,
			},
		],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'The text to extract information from',
				typeOptions: {
					rows: 2,
				},
			},
			{
				...schemaTypeField,
				description: 'How to specify the schema for the desired output',
				options: [
					{
						name: 'From Attribute Descriptions',
						value: 'fromAttributes',
						description:
							'Extract specific attributes from the text based on types and descriptions',
					} as INodePropertyOptions,
					...(schemaTypeField.options as INodePropertyOptions[]),
				],
				default: 'fromAttributes',
			},
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
				displayName:
					'The schema has to be defined in the <a target="_blank" href="https://json-schema.org/">JSON Schema</a> format. Look at <a target="_blank" href="https://json-schema.org/learn/miscellaneous-examples.html">this</a> page for examples.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						schemaType: ['manual'],
					},
				},
			},
			{
				displayName: 'Attributes',
				name: 'attributes',
				placeholder: 'Add Attribute',
				type: 'fixedCollection',
				default: {},
				displayOptions: {
					show: {
						schemaType: ['fromAttributes'],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attributes',
						displayName: 'Attribute List',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Attribute to extract',
								placeholder: 'e.g. company_name',
								required: true,
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description: 'Data type of the attribute',
								required: true,
								options: [
									{
										name: 'Boolean',
										value: 'boolean',
									},
									{
										name: 'Date',
										value: 'date',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'String',
										value: 'string',
									},
								],
								default: 'string',
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'Describe your attribute',
								placeholder: 'Add description for the attribute',
								required: true,
							},
							{
								displayName: 'Required',
								name: 'required',
								type: 'boolean',
								default: false,
								description: 'Whether attribute is required',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'System Prompt Template',
						name: 'systemPromptTemplate',
						type: 'string',
						default: SYSTEM_PROMPT_TEMPLATE,
						description: 'String to use directly as the system prompt template',
						typeOptions: {
							rows: 6,
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const llm = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const schemaType = this.getNodeParameter('schemaType', 0, '') as
			| 'fromAttributes'
			| 'fromJson'
			| 'manual';

		let parser: OutputFixingParser<object>;

		if (schemaType === 'fromAttributes') {
			const attributes = this.getNodeParameter(
				'attributes.attributes',
				0,
				[],
			) as AttributeDefinition[];

			if (attributes.length === 0) {
				throw new NodeOperationError(this.getNode(), 'At least one attribute must be specified');
			}

			parser = OutputFixingParser.fromLLM(
				llm,
				StructuredOutputParser.fromZodSchema(makeZodSchemaFromAttributes(attributes)),
			);
		} else {
			let jsonSchema: JSONSchema7;

			if (schemaType === 'fromJson') {
				const jsonExample = this.getNodeParameter('jsonSchemaExample', 0, '') as string;
				jsonSchema = generateSchema(jsonExample);
			} else {
				const inputSchema = this.getNodeParameter('inputSchema', 0, '') as string;
				jsonSchema = jsonParse<JSONSchema7>(inputSchema);
			}

			const zodSchema = convertJsonSchemaToZod<z.ZodSchema<object>>(jsonSchema);

			parser = OutputFixingParser.fromLLM(llm, StructuredOutputParser.fromZodSchema(zodSchema));
		}

		const resultData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const input = this.getNodeParameter('text', itemIndex) as string;
			const inputPrompt = new HumanMessage(input);

			const options = this.getNodeParameter('options', itemIndex, {}) as {
				systemPromptTemplate?: string;
			};

			const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(
				`${options.systemPromptTemplate ?? SYSTEM_PROMPT_TEMPLATE}
{format_instructions}`,
			);

			const messages = [
				await systemPromptTemplate.format({
					format_instructions: parser.getFormatInstructions(),
				}),
				inputPrompt,
			];
			const prompt = ChatPromptTemplate.fromMessages(messages);
			const chain = prompt.pipe(llm).pipe(parser).withConfig(getTracingConfig(this));

			try {
				const output = await chain.invoke(messages);
				resultData.push({ json: { output } });
			} catch (error) {
				if (this.continueOnFail()) {
					resultData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
					continue;
				}

				throw error;
			}
		}

		return [resultData];
	}
}
