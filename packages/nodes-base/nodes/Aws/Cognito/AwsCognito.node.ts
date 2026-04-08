import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { group, user, userPool } from './descriptions';
import { preSendStringifyBody } from './helpers/utils';
import { listSearch } from './methods';

export class AwsCognito implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Cognito',
		name: 'awsCognito',
		icon: {
			light: 'file:cognito.svg',
			dark: 'file:cognito.svg',
		},
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to AWS Cognito',
		defaults: {
			name: 'AWS Cognito',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			headers: {
				'Content-Type': 'application/x-amz-json-1.1',
			},
			qs: {
				service: 'cognito-idp',
				_region: '={{$credentials.region}}',
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
						preSend: [preSendStringifyBody],
					},
				},
				options: [
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'User Pool',
						value: 'userPool',
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
