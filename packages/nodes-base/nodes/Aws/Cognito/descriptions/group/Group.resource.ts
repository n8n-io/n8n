import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';
import { handleError } from '../../helpers/errorHandler';
import { processGroup } from '../../helpers/utils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: ['group'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new group',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.CreateGroup',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleError,
							{
								type: 'rootProperty',
								properties: {
									property: 'Group',
								},
							},
						],
					},
				},
				action: 'Create group',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an existing group',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.DeleteGroup',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleError,
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true } }}',
								},
							},
						],
					},
				},
				action: 'Delete group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve details of an existing group',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.GetGroup',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError, processGroup],
					},
				},
				action: 'Get group',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of groups',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleError,
							processGroup,
							{
								type: 'rootProperty',
								properties: {
									property: 'Groups',
								},
							},
						],
					},
				},
				action: 'Get many groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing group',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.UpdateGroup',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleError,
							{
								type: 'set',
								properties: {
									value: '={{ { "updated": true } }}',
								},
							},
						],
					},
				},
				action: 'Update group',
			},
		],
	},

	...create.description,
	...del.description,
	...get.description,
	...getAll.description,
	...update.description,
];
