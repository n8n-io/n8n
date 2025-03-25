import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { group, user, userPool } from './descriptions';
import { presendStringifyBody } from './helpers/utils';
import { listSearch } from './methods';

export class AwsCognito implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Cognito',
		name: 'awsCognito',
		icon: 'file:cognito.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interacts with Amazon Cognito',
		defaults: { name: 'AWS Cognito' },
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '=https://cognito-idp.{{$credentials.region}}.amazonaws.com',
			url: '',
			json: true,
			headers: {
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'user',
				routing: {
					send: {
						preSend: [presendStringifyBody],
					},
				},
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'User Pool',
						value: 'userPool',
					},
					{
						name: 'Group',
						value: 'group',
					},
				],
			},
			...group.description,
			...user.description,
			...userPool.description,
		],
	};

	methods = {
		listSearch,
	};
}
