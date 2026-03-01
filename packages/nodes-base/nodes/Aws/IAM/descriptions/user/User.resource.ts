import type { INodeProperties } from 'n8n-workflow';

import * as addToGroup from './addToGroup.operation';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as removeFromGroup from './removeFromGroup.operation';
import * as update from './update.operation';
import { CURRENT_VERSION } from '../../helpers/constants';
import { handleError } from '../../helpers/errorHandler';
import { removeUserFromGroups, simplifyGetAllUsersResponse } from '../../helpers/utils';

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
					request: {
						method: 'POST',
						url: '',
						body: {
							Action: 'AddUserToGroup',
							Version: CURRENT_VERSION,
							UserName: '={{ $parameter["user"] }}',
							GroupName: '={{ $parameter["group"] }}',
						},
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
					request: {
						method: 'POST',
						url: '',
						body: {
							Action: 'CreateUser',
							Version: CURRENT_VERSION,
							UserName: '={{ $parameter["userName"] }}',
						},
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
						preSend: [removeUserFromGroups],
					},
					request: {
						method: 'POST',
						url: '',
						body: {
							Action: 'DeleteUser',
							Version: CURRENT_VERSION,
							UserName: '={{ $parameter["user"] }}',
						},
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
				description: 'Retrieve a user',
				action: 'Get user',
				routing: {
					request: {
						method: 'POST',
						url: '',
						body: {
							Action: 'GetUser',
							Version: CURRENT_VERSION,
							UserName: '={{ $parameter["user"] }}',
						},
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
					request: {
						method: 'POST',
						url: '',
						body: {
							Action: 'ListUsers',
							Version: CURRENT_VERSION,
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError, simplifyGetAllUsersResponse],
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
					request: {
						method: 'POST',
						url: '',
						body: {
							Action: 'RemoveUserFromGroup',
							Version: CURRENT_VERSION,
							UserName: '={{ $parameter["user"] }}',
							GroupName: '={{ $parameter["group"] }}',
						},
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
					request: {
						method: 'POST',
						url: '',
						body: {
							Action: 'UpdateUser',
							Version: CURRENT_VERSION,
							NewUserName: '={{ $parameter["userName"] }}',
							UserName: '={{ $parameter["user"] }}',
						},
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
