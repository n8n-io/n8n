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
import type { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { HumanMessage } from '@langchain/core/messages';
import { generateSchema, getSandboxWithZod } from '../../../utils/schemaParsing';
import {
	inputSchemaField,
	jsonSchemaExampleField,
	schemaTypeField,
} from '../../../utils/descriptions';
import { getTracingConfig } from '../../../utils/tracing';
import type { AttributeDefinition } from './types';
import { makeZodSchemaFromAttributes } from './helpers';
import { OutputParserException } from '@langchain/core/output_parsers';

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
								displayName: 'Attribute Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Attribute to extract',
								required: true,
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description: 'Attribute to extract',
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
										name: 'Date and Time',
										value: 'datetime',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'String',
										value: 'string',
									},
									{
										name: 'Time',
										value: 'time',
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
							},
						],
					},
				],
			},
			{
				displayName: 'When Attribute Not Found',
				name: 'notFoundStrategy',
				type: 'options',
				description: 'Choose what to do when an attribute is not found',
				options: [
					// This will translate in a schema with all attributes being optional
					{
						name: 'Skip Attribute and Continue',
						value: 'emptyAttribute',
					},
					// This will translate in a schema with all attributes being required
					{
						name: 'Set Object to Empty and Continue',
						value: 'emptyObject',
					},
					// This will translate in a scheme with all attributes being required + throw an exception on the first missing attribute
					{
						name: 'Fail',
						value: 'fail',
					},
				],
				default: 'emptyAttribute',
				displayOptions: {
					show: {
						schemaType: ['fromAttributes'],
					},
				},
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
			| 'fromAttributes'
			| 'fromJson'
			| 'manual';

		const notFoundStrategy = this.getNodeParameter('notFoundStrategy', 0, 'emptyAttribute') as
			| 'emptyAttribute'
			| 'emptyObject'
			| 'fail';

		let parser: StructuredOutputParser<z.ZodTypeAny>;
		if (schemaType === 'fromAttributes') {
			const attributes = this.getNodeParameter(
				'attributes.attributes',
				0,
				{},
			) as AttributeDefinition[];

			// Make zod schema strict (all attributes required) if notFoundStrategy is not 'emptyAttribute'
			const strictSchema = notFoundStrategy !== 'emptyAttribute';

			parser = StructuredOutputParser.fromZodSchema(
				makeZodSchemaFromAttributes(attributes, strictSchema),
			);

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

			try {
				const output = await chain.invoke(messages);
				resultData.push({ json: { output } });
			} catch (e) {
				console.error(e);
				// Add special error handling for missing attributes only for the 'fromAttributes' schema type
				// Catch the error thrown by zod validating the output against generated schema
				// If the missing attribute strategy is set to 'emptyObject', return an empty object
				if (
					schemaType === 'fromAttributes' &&
					e instanceof OutputParserException &&
					e.message?.startsWith('Failed to parse') &&
					notFoundStrategy === 'emptyObject'
				) {
					resultData.push({ json: { output: null } });
				} else {
					// Re-throw the error if the schema type is not 'fromAttributes'
					throw e;
				}
			}
		}

		return [resultData];
	}
}
