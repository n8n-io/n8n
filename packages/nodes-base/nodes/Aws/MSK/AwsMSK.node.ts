import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { cluster } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsMSK implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS MSK',
		name: 'awsMSK',
		icon: 'file:msk.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Managed Streaming for Apache Kafka',
		defaults: { name: 'AWS MSK' },
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
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'cluster',
				options: [
					{
						name: 'Cluster',
						value: 'cluster',
					},
				],
			},
			...cluster.description,
		],
	};
}
