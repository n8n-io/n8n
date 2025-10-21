import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { stack, changeSet } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsCloudFormation implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS CloudFormation',
		name: 'awsCloudFormation',
		icon: 'file:cloudformation.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS CloudFormation',
		defaults: { name: 'AWS CloudFormation' },
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
				default: 'stack',
				options: [
					{
						name: 'Stack',
						value: 'stack',
					},
					{
						name: 'Change Set',
						value: 'changeSet',
					},
				],
			},
			...stack.description,
			...changeSet.description,
		],
	};
}
