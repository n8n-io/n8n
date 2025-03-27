import {
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	NodeApiError,
	updateDisplayOptions,
	type INodeProperties,
} from 'n8n-workflow';

import { validateArn } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'User Pool',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'The user pool where the users are managed',
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUserPools',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx".',
						},
					},
				],
				placeholder: 'e.g. eu-central-1_ab12cdefgh',
			},
		],
	},
	{
		displayName: 'Group Name',
		name: 'newGroupName',
		default: '',
		placeholder: 'e.g. MyNewGroup',
		description: 'The name of the new group to create',
		required: true,
		type: 'string',
		validateType: 'string',
		routing: {
			send: {
				property: 'GroupName',
				type: 'body',
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const newGroupName = this.getNodeParameter('newGroupName', '') as string;
						const groupNameRegex = /^[\p{L}\p{M}\p{S}\p{N}\p{P}]+$/u;
						if (!groupNameRegex.test(newGroupName)) {
							throw new NodeApiError(this.getNode(), {
								message: 'Invalid format for Group Name',
								description: 'Group Name should not contain spaces.',
							});
						}
						return requestOptions;
					},
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				default: '',
				placeholder: 'e.g. New group description',
				description: 'A description for the new group',
				type: 'string',
				routing: {
					send: {
						type: 'body',
						property: 'Description',
					},
				},
			},
			{
				displayName: 'Precedence',
				name: 'precedence',
				default: '',
				placeholder: 'e.g. 10',
				description: 'Precedence value for the group. Lower values indicate higher priority.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'Precedence',
					},
				},
				validateType: 'number',
			},
			{
				displayName: 'Role ARN',
				name: 'arn',
				default: '',
				placeholder: 'e.g. arn:aws:iam::123456789012:role/GroupRole',
				description: 'The role ARN for the group, used for setting claims in tokens',
				type: 'string',
				routing: {
					send: {
						type: 'body',
						property: 'Arn',
						preSend: [validateArn],
					},
				},
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
