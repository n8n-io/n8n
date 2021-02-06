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
} from '../GenericFunctions';

export class AmazonComprehend implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Amazon Comprehend',
		name: 'amazonComprehend',
		icon: 'file:comprehend.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Amazon Comprehend',
		defaults: {
			name: 'Amazon Comprehend',
			color: '#305b94',
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
				displayName: 'LanguageCode',
				name: 'languageCode',
				type: 'string',
				default: 'en',
				displayOptions: {
					show: {
						resource: [
							'text',
						],
						operation: [
							'detectSentiment'
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let body: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			if (resource === 'text') {
				const text = this.getNodeParameter('text', i) as string;
				body['Text'] = text;

				// https://docs.aws.amazon.com/comprehend/latest/dg/API_DetectDominantLanguage.html
				if (operation === 'detectDominantLanguage') {
					const action = 'Comprehend_20171127.DetectDominantLanguage';

					responseData = await awsApiRequestREST.call(this, 'comprehend', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });
				}

				// https://docs.aws.amazon.com/comprehend/latest/dg/API_DetectSentiment.html
				if (operation === 'detectSentiment') {
					const action = 'Comprehend_20171127.DetectSentiment';
					const languageCode = this.getNodeParameter('languageCode', i) as string;
					body['LanguageCode'] = languageCode;

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
