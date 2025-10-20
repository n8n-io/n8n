import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { stateMachine, execution, activity } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsStepFunctions implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Step Functions',
		name: 'awsStepFunctions',
		icon: 'file:stepfunctions.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Step Functions',
		defaults: { name: 'AWS Step Functions' },
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
				'Content-Type': 'application/x-amz-json-1.0',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'stateMachine',
				options: [
					{
						name: 'State Machine',
						value: 'stateMachine',
					},
					{
						name: 'Execution',
						value: 'execution',
					},
					{
						name: 'Activity',
						value: 'activity',
					},
				],
			},
			...stateMachine.description,
			...execution.description,
			...activity.description,
		],
	};
}
