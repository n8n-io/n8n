import type { INodeProperties } from 'n8n-workflow';
import { userCreateDescription } from './create';
import { userGetDescription } from './get';

const showOnlyForUsers = {
	resource: ['user'],
};

export const userDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForUsers,
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get users',
				description: 'Get many users',
				routing: {
					request: {
						method: 'GET',
						url: '/users',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a user',
				description: 'Get the data of a single user',
				routing: {
					request: {
						method: 'GET',
						url: '=/users/{{$parameter.userId}}',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a new user',
				description: 'Create a new user',
				routing: {
					request: {
						method: 'POST',
						url: '/users',
					},
				},
			},
		],
		default: 'getAll',
	},
	...userGetDescription,
	...userCreateDescription,
];
