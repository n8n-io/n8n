import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { cacheCluster } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsElastiCache implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS ElastiCache',
		name: 'awsElastiCache',
		icon: 'file:elasticache.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS ElastiCache',
		defaults: { name: 'AWS ElastiCache' },
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
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'cacheCluster',
				options: [
					{
						name: 'Cache Cluster',
						value: 'cacheCluster',
					},
				],
			},
			...cacheCluster.description,
		],
	};
}
