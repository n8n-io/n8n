import type {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { configOperations, configFields, contactOperations, contactFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsGroundStation implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Ground Station',
		name: 'awsGroundStation',
		icon: 'file:groundstation.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with AWS Ground Station',
		defaults: {
			name: 'AWS Ground Station',
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
				'Content-Type': 'application/json',
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
						name: 'Config',
						value: 'config',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'config',
			},
			...configOperations,
			...configFields,
			...contactOperations,
			...contactFields,
		],
	};
}
