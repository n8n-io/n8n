import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { accountOperations, accountFields, ouOperations, ouFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsOrganizations implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Organizations',
		name: 'awsOrganizations',
		icon: 'file:organizations.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with AWS Organizations',
		defaults: { name: 'AWS Organizations' },
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
					{ name: 'Account', value: 'account' },
					{ name: 'Organizational Unit', value: 'ou' },
				],
				default: 'account',
			},
			...accountOperations,
			...accountFields,
			...ouOperations,
			...ouFields,
		],
	};
}
