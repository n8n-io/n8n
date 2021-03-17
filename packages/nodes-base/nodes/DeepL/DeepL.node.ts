
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	deepLApiRequest,
} from './GenericFunctions';


export class DeepL implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DeepL',
		name: 'deepL',
		icon: 'file:deepl.png',
		group: ['input', 'output'],
		version: 1,
		description: 'Translate data using DeepL',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'DeepL',
			color: '#0f2b46',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'deepLApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'apiKey',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'API Key',
						value: 'apiKey',
					},
				],
				default: 'apiKey',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Language',
						value: 'language',
					},
				],
				default: 'language',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'language',
						],
					},
				},
				options: [
					{
						name: 'Translate',
						value: 'translate',
						description: 'Translate data',
					},
				],
				default: 'translate',
				description: 'The operation to perform',
			},
			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'The input text to translate',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'translate',
						],
					},
				},
			},
			{
				displayName: 'Translate To',
				name: 'translateTo',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
				default: '',
				description: 'The language to use for translation of the input text.',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'translate',
						],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Source language',
						name: 'sourceLang',
						type: 'options',
						default: '',
						description: 'Source text language. For supported languages, visit ',
						typeOptions: {
							loadOptionsMethod: 'getLanguages',
						},
					},
					{
						displayName: 'Split sentences',
						name: 'splitSentences',
						type: 'options',
						default: '1',
						description: 'Sets if the translation engine should split into sentences.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getLanguages(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const languages = await deepLApiRequest.call(
					this,
					'GET',
					'/languages',
					{},
					{type: 'target'},
				);
				for (const language of languages) {
					returnData.push({
						name: language.name,
						value: language.language,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;

		const responseData = [];
		for (let i = 0; i < length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;
			const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
			if (resource === 'language') {
				if (operation === 'translate') {
					const text = this.getNodeParameter('text', i) as string;
					const translateTo = this.getNodeParameter('translateTo', i) as string;
					const qs = {target_lang: translateTo, text} as IDataObject;
					if (additionalFields.sourceLang !== undefined) {
						qs.source_lang = additionalFields.sourceLang;
					}

					const response = await deepLApiRequest.call(this, 'GET', `/translate`, {}, qs);
					responseData.push(response.translations[0]);
				}
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
