import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { user, group } from './descriptions';
import { searchGroups, searchUsers, searchGroupsForUser } from './methods/listSearch';

export class AwsIam implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS IAM',
		name: 'awsIam',
		icon: 'file:iam.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interacts with Amazon IAM',
		defaults: { name: 'AWS IAM' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '=https://iam.amazonaws.com',
			url: '',
			json: true,
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
				default: 'user',
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Group',
						value: 'group',
					},
				],
			},
			...user.description,
			...group.description,
		],
	};

	methods = {
		listSearch: {
			searchGroups,
			searchUsers,
			searchGroupsForUser,
		},
	};
}
