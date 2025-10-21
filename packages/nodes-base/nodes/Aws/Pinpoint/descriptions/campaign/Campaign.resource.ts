import type { INodeProperties } from 'n8n-workflow';
import { handlePinpointError } from '../../helpers/errorHandler';

export const campaignOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new campaign',
				action: 'Create a campaign',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/apps/{{$parameter["applicationId"]}}/campaigns',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'CampaignResponse',
								},
							},
							handlePinpointError,
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a campaign',
				action: 'Delete a campaign',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v1/apps/{{$parameter["applicationId"]}}/campaigns/{{$parameter["campaignId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'CampaignResponse',
								},
							},
							handlePinpointError,
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of a campaign',
				action: 'Get a campaign',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/apps/{{$parameter["applicationId"]}}/campaigns/{{$parameter["campaignId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'CampaignResponse',
								},
							},
							handlePinpointError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all campaigns',
				action: 'List campaigns',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/apps/{{$parameter["applicationId"]}}/campaigns',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'CampaignsResponse.Item',
								},
							},
							handlePinpointError,
						],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a campaign',
				action: 'Update a campaign',
				routing: {
					request: {
						method: 'PUT',
						url: '=/v1/apps/{{$parameter["applicationId"]}}/campaigns/{{$parameter["campaignId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'CampaignResponse',
								},
							},
							handlePinpointError,
						],
					},
				},
			},
		],
	},
];

export const campaignFields: INodeProperties[] = [
	{
		displayName: 'Application ID',
		name: 'applicationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		description: 'The unique identifier for the Pinpoint application',
	},
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['delete', 'get', 'update'],
			},
		},
		description: 'The unique identifier for the campaign',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		description: 'The name of the campaign',
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		description: 'Description of the campaign',
		routing: {
			request: {
				body: {
					Description: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Segment ID',
		name: 'segmentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		description: 'The unique identifier for the segment to target',
		routing: {
			request: {
				body: {
					SegmentId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Message Configuration',
		name: 'messageConfiguration',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		description: 'Message configuration (JSON format)',
		routing: {
			request: {
				body: {
					MessageConfiguration: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Schedule',
		name: 'schedule',
		type: 'json',
		default: '{"StartTime": "IMMEDIATE"}',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		description: 'Schedule configuration (JSON format)',
		routing: {
			request: {
				body: {
					Schedule: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
