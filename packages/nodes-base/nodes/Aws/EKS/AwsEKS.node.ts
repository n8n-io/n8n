import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { cluster, nodegroup } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsEKS implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS EKS',
		name: 'awsEKS',
		icon: 'file:eks.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS EKS',
		defaults: { name: 'AWS EKS' },
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
					{
						name: 'Node Group',
						value: 'nodegroup',
					},
				],
			},
			...cluster.description,
			...nodegroup.description,
		],
	};
}
