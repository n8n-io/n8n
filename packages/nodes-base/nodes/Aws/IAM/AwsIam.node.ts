import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { userOperations, userFields, groupOperations, groupFields } from './descriptions';
import { searchGroups, searchGroupsForUser, searchUsers } from './GenericFunctions';

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
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		hints: [
			{
				message: 'Please select a parameter in the additional fields to update the user',
				displayCondition:
					'={{$parameter["resource"] === "user" && $parameter["operation"] === "update" && Object.keys($parameter["additionalOptions"]).length === 0}}',
				whenToDisplay: 'always',
				location: 'outputPane',
				type: 'warning',
			},
		],
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
			...userOperations,
			...userFields,
			...groupOperations,
			...groupFields,
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
