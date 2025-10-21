import type { INodeProperties } from 'n8n-workflow';
import { handleConnectError } from '../../helpers/errorHandler';

export const contactFlowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['contactFlow'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact flow',
				action: 'Create a contact flow',
				routing: {
					request: {
						method: 'PUT',
						url: '=/contact-flows/{{$parameter["instanceId"]}}',
					},
					output: {
						postReceive: [handleConnectError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact flow',
				action: 'Delete a contact flow',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/contact-flows/{{$parameter["instanceId"]}}/{{$parameter["contactFlowId"]}}',
					},
					output: {
						postReceive: [handleConnectError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of a contact flow',
				action: 'Describe a contact flow',
				routing: {
					request: {
						method: 'GET',
						url: '=/contact-flows/{{$parameter["instanceId"]}}/{{$parameter["contactFlowId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'ContactFlow',
								},
							},
							handleConnectError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all contact flows',
				action: 'List contact flows',
				routing: {
					request: {
						method: 'GET',
						url: '=/contact-flows-summary/{{$parameter["instanceId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'ContactFlowSummaryList',
								},
							},
							handleConnectError,
						],
					},
				},
			},
		],
	},
];

export const contactFlowFields: INodeProperties[] = [
	{
		displayName: 'Instance ID',
		name: 'instanceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contactFlow'],
			},
		},
		description: 'The identifier of the instance',
	},
	{
		displayName: 'Contact Flow ID',
		name: 'contactFlowId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contactFlow'],
				operation: ['delete', 'describe'],
			},
		},
		description: 'The identifier of the contact flow',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contactFlow'],
				operation: ['create'],
			},
		},
		description: 'The name of the contact flow',
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'CONTACT_FLOW',
		displayOptions: {
			show: {
				resource: ['contactFlow'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Contact Flow',
				value: 'CONTACT_FLOW',
			},
			{
				name: 'Customer Queue',
				value: 'CUSTOMER_QUEUE',
			},
			{
				name: 'Customer Hold',
				value: 'CUSTOMER_HOLD',
			},
			{
				name: 'Customer Whisper',
				value: 'CUSTOMER_WHISPER',
			},
			{
				name: 'Agent Hold',
				value: 'AGENT_HOLD',
			},
			{
				name: 'Agent Whisper',
				value: 'AGENT_WHISPER',
			},
		],
		description: 'The type of contact flow',
		routing: {
			request: {
				body: {
					Type: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contactFlow'],
				operation: ['create'],
			},
		},
		description: 'The content of the contact flow (JSON string)',
		routing: {
			request: {
				body: {
					Content: '={{ $value }}',
				},
			},
		},
	},
];
