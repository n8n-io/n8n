import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	awsApiRequestREST,
} from './GenericFunctions';

export class AwsComprehend implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Comprehend',
		name: 'awsComprehend',
		icon: 'file:comprehend.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Amazon Comprehend',
		defaults: {
			name: 'AWS Comprehend',
			color: '#5aa08d',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Text',
						value: 'text',
					},
				],
				default: 'text',
				description: 'The resource to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Detect Dominant Language',
						value: 'detectDominantLanguage',
						description: 'Identify the dominant language',
					},
					{
						name: 'Detect Sentiment',
						value: 'detectSentiment',
						description: 'Analyse the sentiment of the text',
					},
				],
				default: 'detectDominantLanguage',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Language Code',
				name: 'languageCode',
				type: 'options',
				options: [
					{
						name: 'Arabic',
						value: 'ar',
					},
					{
						name: 'Chinese',
						value: 'zh',
					},
					{
						name: 'Chinese (T)',
						value: 'zh-TW',
					},
					{
						name: 'English',
						value: 'en',
					},
					{
						name: 'French',
						value: 'fr',
					},
					{
						name: 'German',
						value: 'de',
					},
					{
						name: 'Hindi',
						value: 'hi',
					},
					{
						name: 'Italian',
						value: 'it',
					},
					{
						name: 'Japanese',
						value: 'ja',
					},
					{
						name: 'Korean',
						value: 'ko',
					},
					{
						name: 'Portuguese',
						value: 'pt',
					},
					{
						name: 'Spanish',
						value: 'es',
					},
				],
				default: 'en',
				displayOptions: {
					show: {
						resource: [
							'text',
						],
						operation: [
							'detectSentiment',
						],
					},
				},
				description: 'The language code for text.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				displayOptions: {
					show: {
						resource: [
							'text',
						],
					},
				},
				description: 'The text to send.',
			},
			{
				displayName: 'Simple',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'text',
						],
						operation: [
							'detectDominantLanguage',
						],
					},
				},
				default: true,
				description: 'When set to true a simplify version of the response will be used else the raw data.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < items.length; i++) {
			if (resource === 'text') {
				//https://docs.aws.amazon.com/comprehend/latest/dg/API_DetectDominantLanguage.html
				if (operation === 'detectDominantLanguage') {
					const text = this.getNodeParameter('text', i) as string;
					const simple = this.getNodeParameter('simple', i) as boolean;

					const body: IDataObject = {
						Text: text,
					};
					const action = 'Comprehend_20171127.DetectDominantLanguage';
					responseData = await awsApiRequestREST.call(this, 'comprehend', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });

					if (simple === true) {
						responseData = responseData.Languages.reduce((accumulator: { [key: string]: number }, currentValue: IDataObject) => {
							accumulator[currentValue.LanguageCode as string] = currentValue.Score as number;
							return accumulator;
						}, {});
					}
				}

				//https://docs.aws.amazon.com/comprehend/latest/dg/API_DetectSentiment.html
				if (operation === 'detectSentiment') {
					const action = 'Comprehend_20171127.DetectSentiment';
					const text = this.getNodeParameter('text', i) as string;
					const languageCode = this.getNodeParameter('languageCode', i) as string;
					const body: IDataObject = {
						Text: text,
						LanguageCode: languageCode,
					};
					responseData = await awsApiRequestREST.call(this, 'comprehend', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
