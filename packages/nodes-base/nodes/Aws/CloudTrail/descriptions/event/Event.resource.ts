import type { INodeProperties } from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['event'],
			},
		},
		options: [
			{
				name: 'Lookup',
				value: 'lookup',
				description: 'Look up management events',
				action: 'Lookup events',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CloudTrail_20131101.LookupEvents',
						},
					},
				},
			},
		],
		default: 'lookup',
	},
];

export const eventFields: INodeProperties[] = [
	{
		displayName: 'Lookup Attributes',
		name: 'LookupAttributes',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['lookup'],
			},
		},
		default: '[{"AttributeKey": "EventName", "AttributeValue": "RunInstances"}]',
		routing: {
			request: {
				body: {
					LookupAttributes: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'Lookup attributes (AttributeKey: EventName, ResourceType, Username, ResourceName, EventId, AccessKeyId)',
	},
	{
		displayName: 'Start Time',
		name: 'StartTime',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['lookup'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					StartTime: '={{ new Date($value).toISOString() }}',
				},
			},
		},
		description: 'Start time for event lookup',
	},
	{
		displayName: 'End Time',
		name: 'EndTime',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['lookup'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					EndTime: '={{ new Date($value).toISOString() }}',
				},
			},
		},
		description: 'End time for event lookup',
	},
	{
		displayName: 'Max Results',
		name: 'MaxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['lookup'],
			},
		},
		default: 50,
		routing: {
			request: {
				body: {
					MaxResults: '={{ $value }}',
				},
			},
		},
		description: 'Maximum number of events to return (1-50)',
	},
];
