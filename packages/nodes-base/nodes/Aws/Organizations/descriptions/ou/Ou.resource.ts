import type { INodeProperties } from 'n8n-workflow';

export const ouOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['ou'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an organizational unit',
				action: 'Create an OU',
				routing: { request: { method: 'POST', headers: { 'X-Amz-Target': 'AWSOrganizationsV20161128.CreateOrganizationalUnit' } } },
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an organizational unit',
				action: 'Delete an OU',
				routing: { request: { method: 'POST', headers: { 'X-Amz-Target': 'AWSOrganizationsV20161128.DeleteOrganizationalUnit' } } },
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get OU details',
				action: 'Get an OU',
				routing: { request: { method: 'POST', headers: { 'X-Amz-Target': 'AWSOrganizationsV20161128.DescribeOrganizationalUnit' } } },
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List organizational units',
				action: 'Get many OUs',
				routing: { request: { method: 'POST', headers: { 'X-Amz-Target': 'AWSOrganizationsV20161128.ListOrganizationalUnitsForParent' } } },
			},
		],
		default: 'create',
	},
];

export const ouFields: INodeProperties[] = [
	{
		displayName: 'Parent ID',
		name: 'ParentId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['ou'], operation: ['create', 'getMany'] } },
		default: '',
		routing: { request: { body: { ParentId: '={{ $value }}' } } },
		description: 'The parent OU or root ID',
	},
	{
		displayName: 'Name',
		name: 'Name',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['ou'], operation: ['create'] } },
		default: '',
		routing: { request: { body: { Name: '={{ $value }}' } } },
		description: 'The name of the organizational unit',
	},
	{
		displayName: 'Organizational Unit ID',
		name: 'OrganizationalUnitId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['ou'], operation: ['get', 'delete'] } },
		default: '',
		routing: { request: { body: { OrganizationalUnitId: '={{ $value }}' } } },
		description: 'The unique identifier of the OU',
	},
];
