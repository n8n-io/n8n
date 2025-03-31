import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';
import { CURRENT_VERSION } from '../../helpers/constants';
import { handleError } from '../../helpers/errorHandler';
import { deleteGroupMembers, processGroupsResponse } from '../../helpers/utils';

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
						url: `=/?Action=CreateGroup&Version=${CURRENT_VERSION}&GroupName={{ $parameter["newGroupName"] }}`,
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
				action: 'Create group',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an existing group',
				routing: {
					send: {
						preSend: [deleteGroupMembers],
					},
					request: {
						method: 'POST',
						url: `=/?Action=DeleteGroup&Version=${CURRENT_VERSION}&GroupName={{ $parameter["group"] }}`,
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
				action: 'Delete group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve details of an existing group',
				routing: {
					send: {
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								console.log(requestOptions);
								return requestOptions;
							},
						],
					},
					request: {
						method: 'POST',
						url: `=/?Action=GetGroup&Version=${CURRENT_VERSION}&GroupName={{ $parameter["group"] }}`,
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError, processGroupsResponse],
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
						url: `/?Action=ListGroups&Version=${CURRENT_VERSION}`,
						qs: {
							pageSize:
								'={{ $parameter["limit"] ? ($parameter["limit"] < 60 ? $parameter["limit"] : 60) : 60 }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError, processGroupsResponse],
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
						url: `=/?Action=UpdateGroup&Version=${CURRENT_VERSION}&GroupName={{ $parameter["group"] }}&NewGroupName={{ $parameter["newGroupName"] }}`,
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
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
