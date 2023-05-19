import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { deepLApiRequest } from './GenericFunctions';

import { textOperations } from './TextDescription';

export class DeepL implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DeepL',
		name: 'deepL',
		icon: 'file:deepl.svg',
		group: ['input', 'output'],
		version: 1,
		description: 'Translate data using DeepL',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'DeepL',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'deepLApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Language',
						value: 'language',
					},
				],
				default: 'language',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['language'],
					},
				},
				options: [
					{
						name: 'Translate',
						value: 'translate',
						description: 'Translate data',
						action: 'Translate a language',
					},
				],
				default: 'translate',
			},
			...textOperations,
		],
	};

	methods = {
		loadOptions: {
			async getLanguages(this: ILoadOptionsFunctions) {
				const returnData: INodePropertyOptions[] = [];
				const languages = await deepLApiRequest.call(
					this,
					'GET',
					'/languages',
					{},
					{ type: 'target' },
				);
				for (const language of languages) {
					returnData.push({
						name: language.name,
						value: language.language,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;

		const responseData: INodeExecutionData[] = [];

		for (let i = 0; i < length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i);
				const operation = this.getNodeParameter('operation', i);
				const additionalFields = this.getNodeParameter('additionalFields', i);
				if (resource === 'language') {
					if (operation === 'translate') {
						let body: IDataObject = {};
						const text = this.getNodeParameter('text', i) as string;
						const translateTo = this.getNodeParameter('translateTo', i) as string;
						body = { target_lang: translateTo, text } as IDataObject;

						if (additionalFields.sourceLang !== undefined) {
							body.source_lang = ['EN-GB', 'EN-US'].includes(additionalFields.sourceLang as string)
								? 'EN'
								: additionalFields.sourceLang;
						}

						const { translations } = await deepLApiRequest.call(this, 'GET', '/translate', body);
						const [translation] = translations;
						const translationJsonArray = this.helpers.returnJsonArray(translation as IDataObject[]);
						const executionData = this.helpers.constructExecutionMetaData(translationJsonArray, {
							itemData: { item: i },
						});
						responseData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = {
						json: {} as IDataObject,
						error: error.message,
						itemIndex: i,
					};
					responseData.push(executionErrorData as INodeExecutionData);
					continue;
				}
				throw error;
			}
		}

		return [responseData];
	}
}
