import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { server, user } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsTransfer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Transfer Family',
		name: 'awsTransfer',
		icon: 'file:transfer.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Transfer Family',
		defaults: { name: 'AWS Transfer Family' },
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
				default: 'server',
				options: [
					{
						name: 'Server',
						value: 'server',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
			},
			...server.description,
			...user.description,
		],
	};
}
