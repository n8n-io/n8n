import type {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { trailOperations, trailFields, eventOperations, eventFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsCloudTrail implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS CloudTrail',
		name: 'awsCloudTrail',
		icon: 'file:cloudtrail.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with AWS CloudTrail',
		defaults: {
			name: 'AWS CloudTrail',
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
						name: 'Trail',
						value: 'trail',
					},
					{
						name: 'Event',
						value: 'event',
					},
				],
				default: 'trail',
			},
			...trailOperations,
			...trailFields,
			...eventOperations,
			...eventFields,
		],
	};
}
