import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { cluster, task } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsECS implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS ECS',
		name: 'awsECS',
		icon: 'file:ecs.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS ECS',
		defaults: { name: 'AWS ECS' },
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
				'Content-Type': 'application/x-amz-json-1.1',
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
						name: 'Task',
						value: 'task',
					},
				],
			},
			...cluster.description,
			...task.description,
		],
	};
}
