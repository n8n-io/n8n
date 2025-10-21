import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { taskOperations, taskFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsDataSync implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS DataSync',
		name: 'awsDataSync',
		icon: 'file:datasync.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS DataSync',
		defaults: { name: 'AWS DataSync' },
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
				Accept: 'application/json',
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'task',
				options: [
					{
						name: 'Task',
						value: 'task',
					},
				],
			},
			...taskOperations,
			...taskFields,
		],
	};
}
