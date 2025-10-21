import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['schedule'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a schedule',
				action: 'Create a schedule',
				routing: {
					request: {
						method: 'POST',
						url: '/schedules/{{$parameter["scheduleName"]}}',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							ScheduleExpression: '={{ $parameter["scheduleExpression"] }}',
							FlexibleTimeWindow: '={{ $parameter["flexibleTimeWindow"] }}',
							Target: '={{ $parameter["target"] }}',
							State: '={{ $parameter["state"] }}',
							Description: '={{ $parameter["description"] }}',
							StartDate: '={{ $parameter["startDate"] }}',
							EndDate: '={{ $parameter["endDate"] }}',
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
				description: 'Delete a schedule',
				action: 'Delete a schedule',
				routing: {
					request: {
						method: 'DELETE',
						url: '/schedules/{{$parameter["scheduleName"]}}',
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
				description: 'Get schedule details',
				action: 'Get a schedule',
				routing: {
					request: {
						method: 'GET',
						url: '/schedules/{{$parameter["scheduleName"]}}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List schedules',
				action: 'List schedules',
				routing: {
					request: {
						method: 'GET',
						url: '=/schedules?MaxResults={{ $parameter["maxResults"] }}&NextToken={{ $parameter["nextToken"] }}',
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
				description: 'Update a schedule',
				action: 'Update a schedule',
				routing: {
					request: {
						method: 'PUT',
						url: '/schedules/{{$parameter["scheduleName"]}}',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							ScheduleExpression: '={{ $parameter["scheduleExpression"] }}',
							FlexibleTimeWindow: '={{ $parameter["flexibleTimeWindow"] }}',
							Target: '={{ $parameter["target"] }}',
							State: '={{ $parameter["state"] }}',
							Description: '={{ $parameter["description"] }}',
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
	// Common field
	{
		displayName: 'Schedule Name',
		name: 'scheduleName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
		default: '',
		description: 'Name of the schedule',
	},
	// Create/Update operations
	{
		displayName: 'Schedule Expression',
		name: 'scheduleExpression',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create', 'update'],
			},
		},
		default: 'rate(30 minutes)',
		description: 'Schedule expression (rate or cron)',
	},
	{
		displayName: 'Flexible Time Window',
		name: 'flexibleTimeWindow',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create', 'update'],
			},
		},
		default: '{"Mode": "OFF"}',
		description: 'Flexible time window configuration',
	},
	{
		displayName: 'Target',
		name: 'target',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create', 'update'],
			},
		},
		default: '{"Arn": "arn:aws:lambda:region:account:function:name", "RoleArn": "arn:aws:iam::account:role/role-name"}',
		description: 'Target configuration (ARN, RoleArn, Input, etc.)',
	},
	{
		displayName: 'State',
		name: 'state',
		type: 'options',
		options: [
			{ name: 'Enabled', value: 'ENABLED' },
			{ name: 'Disabled', value: 'DISABLED' },
		],
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create', 'update'],
			},
		},
		default: 'ENABLED',
		description: 'Schedule state',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Schedule description',
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Start date (ISO 8601 format)',
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'End date (ISO 8601 format)',
	},
	// List operation
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of schedules to return',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
];
