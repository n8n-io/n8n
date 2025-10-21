import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { recorderOperations, recorderFields, ruleOperations, ruleFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsConfig implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Config',
		name: 'awsConfig',
		icon: 'file:config.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with AWS Config',
		defaults: { name: 'AWS Config' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'aws', required: true }],
		requestDefaults: {
			baseURL: BASE_URL,
			headers: { 'Content-Type': 'application/x-amz-json-1.1' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Recorder', value: 'recorder' },
					{ name: 'Rule', value: 'rule' },
				],
				default: 'recorder',
			},
			...recorderOperations,
			...recorderFields,
			...ruleOperations,
			...ruleFields,
		],
	};
}
