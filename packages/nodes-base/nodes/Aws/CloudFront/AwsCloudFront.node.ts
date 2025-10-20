import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { distribution, invalidation } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsCloudFront implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS CloudFront',
		name: 'awsCloudFront',
		icon: 'file:cloudfront.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS CloudFront CDN',
		defaults: { name: 'AWS CloudFront' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			headers: {
				'Accept': 'application/xml',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'distribution',
				options: [
					{
						name: 'Distribution',
						value: 'distribution',
					},
					{
						name: 'Invalidation',
						value: 'invalidation',
					},
				],
			},
			...distribution.description,
			...invalidation.description,
		],
	};
}
