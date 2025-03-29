import type { INodeProperties } from 'n8n-workflow';

import * as addToGroup from './addToGroup.operation';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as removeFromGroup from './removeFromGroup.operation';
import * as update from './update.operation';
import { handleError } from '../../helpers/errorHandler';
import { preDeleteUser, presendUserFields, processUsersResponse } from '../../helpers/utils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Add to Group',
				value: 'addToGroup',
				description: 'Add an existing user to a group',
				action: 'Add user to group',
				routing: {
					send: {
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=AddUserToGroup&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new user',
				action: 'Create user',
				routing: {
					send: {
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=CreateUser&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user',
				action: 'Delete user',
				routing: {
					send: {
						preSend: [presendUserFields, preDeleteUser],
					},
					request: {
						method: 'POST',
						url: '/?Action=DeleteUser&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an user',
				action: 'Get user',
				routing: {
					send: {
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=GetUser&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'GetUserResponse.GetUserResult.User',
								},
							},
							handleError,
						],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of users',
				routing: {
					send: {
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=ListUsers&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [processUsersResponse, handleError],
					},
				},
				action: 'Get many users',
			},
			{
				name: 'Remove From Group',
				value: 'removeFromGroup',
				description: 'Remove a user from a group',
				action: 'Remove user from group',
				routing: {
					send: {
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=RemoveUserFromGroup&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user',
				action: 'Update user',
				routing: {
					send: {
						preSend: [presendUserFields],
					},
					request: {
						method: 'POST',
						url: '/?Action=UpdateUser&Version=2010-05-08',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
		],
	},

	...addToGroup.description,
	...create.description,
	...del.description,
	...get.description,
	...getAll.description,
	...update.description,
	...removeFromGroup.description,
];
