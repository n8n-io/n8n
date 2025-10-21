import type {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { textOperations, textFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsTranslate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Translate',
		name: 'awsTranslate',
		icon: 'file:translate.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with AWS Translate',
		defaults: {
			name: 'AWS Translate',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			headers: {
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Text',
						value: 'text',
					},
				],
				default: 'text',
			},
			...textOperations,
			...textFields,
		],
	};
}
