import { jsonParse, NodeConnectionType } from 'n8n-workflow';
import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
} from 'n8n-workflow';
import type { JSONSchema7 } from 'json-schema';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatPromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { HumanMessage } from '@langchain/core/messages';
import { generateSchema, getSandboxWithZod } from '../../../utils/schemaParsing';
import {
	inputSchemaField,
	jsonSchemaExampleField,
	schemaTypeField,
} from '../../../utils/descriptions';
import { getTracingConfig } from '../../../utils/tracing';

const SYSTEM_PROMPT_TEMPLATE = `You are an expert extraction algorithm.
Only extract relevant information from the text.
If you do not know the value of an attribute asked to extract, you may omit the attribute's value.`;

export class InformationExtraction implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Information Extraction',
		name: 'informationExtraction',
		icon: 'fa:code',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Extract information from text in a structured format',
		defaults: {
			name: 'Information Extraction',
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
				options: [
					{
						name: 'From Names and Descriptions',
						value: 'fromNamesAndDescriptions',
						description:
							'Extract specific fields from the text based on the field names and descriptions',
					} as INodePropertyOptions,
					...(schemaTypeField.options as INodePropertyOptions[]),
				],
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
						schemaType: ['fromNamesAndDescriptions'],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attributes',
						displayName: 'Attributes',
						values: [
							{
								displayName: 'Attribute',
								name: 'attribute',
								type: 'string',
								default: '',
								description: 'Attribute to extract',
								required: true,
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'Describe your attribute',
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

		const options = this.getNodeParameter('options', 0, {}) as {
			systemPromptTemplate?: string;
		};
		const schemaType = this.getNodeParameter('schemaType', 0, '') as
			| 'fromNamesAndDescriptions'
			| 'fromJson'
			| 'manual';

		let parser: StructuredOutputParser<z.ZodTypeAny>;
		if (schemaType === 'fromNamesAndDescriptions') {
			const attributes = this.getNodeParameter('attributes.attributes', 0, {}) as Array<{
				attribute: string;
				description: string;
			}>;

			const schemaEntries = attributes.map((attr) => [
				attr.attribute,
				z.string().describe(attr.description),
			]);

			const schema = z.object(Object.fromEntries(schemaEntries));

			parser = StructuredOutputParser.fromZodSchema(schema);

			console.log(parser.getFormatInstructions());
		} else {
			let jsonSchema: JSONSchema7;

			if (schemaType === 'fromJson') {
				const jsonExample = this.getNodeParameter('jsonSchemaExample', 0, '') as string;
				jsonSchema = generateSchema(jsonExample);
			} else {
				const inputSchema = this.getNodeParameter('inputSchema', 0, '') as string;
				jsonSchema = jsonParse<JSONSchema7>(inputSchema);
			}

			const zodSchemaSandbox = getSandboxWithZod(this, jsonSchema, 0);
			const zodSchema = (await zodSchemaSandbox.runCode()) as z.ZodSchema<object>;

			parser = StructuredOutputParser.fromZodSchema(zodSchema);
		}

		const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(
			`${options.systemPromptTemplate ?? SYSTEM_PROMPT_TEMPLATE}
{format_instructions}`,
		);

		// const structuredOutputModel = llm.withStructuredOutput!(zodSchema);

		const resultData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const input = this.getNodeParameter('text', itemIndex) as string;
			const inputPrompt = new HumanMessage(input);
			const messages = [
				await systemPromptTemplate.format({
					format_instructions: parser.getFormatInstructions(),
				}),
				inputPrompt,
			];
			const prompt = ChatPromptTemplate.fromMessages(messages);
			const chain = prompt.pipe(llm).pipe(parser).withConfig(getTracingConfig(this));

			const output = await chain.invoke(messages);

			resultData.push({ json: { output } });
		}

		return [resultData];
	}
}
