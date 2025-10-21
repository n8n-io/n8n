import type {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { networkOperations, networkFields, memberOperations, memberFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsManagedBlockchain implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Managed Blockchain',
		name: 'awsManagedBlockchain',
		icon: 'file:managedblockchain.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with AWS Managed Blockchain',
		defaults: {
			name: 'AWS Managed Blockchain',
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
						name: 'Network',
						value: 'network',
					},
					{
						name: 'Member',
						value: 'member',
					},
				],
				default: 'network',
			},
			...networkOperations,
			...networkFields,
			...memberOperations,
			...memberFields,
		],
	};
}
