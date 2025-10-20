import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { parameter, command } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsSystemsManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Systems Manager',
		name: 'awsSystemsManager',
		icon: 'file:systemsmanager.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Systems Manager',
		defaults: { name: 'AWS Systems Manager' },
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
				default: 'parameter',
				options: [
					{
						name: 'Parameter',
						value: 'parameter',
					},
					{
						name: 'Command',
						value: 'command',
					},
				],
			},
			...parameter.description,
			...command.description,
		],
	};
}
