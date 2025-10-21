import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { schedule } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsScheduler implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS EventBridge Scheduler',
		name: 'awsScheduler',
		icon: 'file:scheduler.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS EventBridge Scheduler',
		defaults: { name: 'AWS EventBridge Scheduler' },
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
				default: 'schedule',
				options: [
					{
						name: 'Schedule',
						value: 'schedule',
					},
				],
			},
			...schedule.description,
		],
	};
}
