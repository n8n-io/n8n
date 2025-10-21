import type { INodeProperties } from 'n8n-workflow';

export const findingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['finding'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive findings',
				action: 'Archive findings',
				routing: {
					request: {
						method: 'POST',
						url: '=/detector/{{$parameter["detectorId"]}}/findings/archive',
						body: {
							FindingIds: '={{ $parameter["findingIds"] }}',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about findings',
				action: 'Get findings',
				routing: {
					request: {
						method: 'POST',
						url: '=/detector/{{$parameter["detectorId"]}}/findings/get',
						body: {
							FindingIds: '={{ $parameter["findingIds"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List finding IDs',
				action: 'List findings',
				routing: {
					request: {
						method: 'POST',
						url: '=/detector/{{$parameter["detectorId"]}}/findings',
					},
				},
			},
			{
				name: 'Unarchive',
				value: 'unarchive',
				description: 'Unarchive findings',
				action: 'Unarchive findings',
				routing: {
					request: {
						method: 'POST',
						url: '=/detector/{{$parameter["detectorId"]}}/findings/unarchive',
						body: {
							FindingIds: '={{ $parameter["findingIds"] }}',
						},
					},
				},
			},
			{
				name: 'Update Feedback',
				value: 'updateFeedback',
				description: 'Mark findings as useful or not',
				action: 'Update finding feedback',
				routing: {
					request: {
						method: 'POST',
						url: '=/detector/{{$parameter["detectorId"]}}/findings/feedback',
						body: {
							FindingIds: '={{ $parameter["findingIds"] }}',
							Feedback: '={{ $parameter["feedback"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const findingFields: INodeProperties[] = [
	{
		displayName: 'Detector ID',
		name: 'detectorId',
		type: 'string',
		required: true,
		default: '',
		description: 'The unique ID of the detector',
	},
	{
		displayName: 'Finding IDs (JSON)',
		name: 'findingIds',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['archive', 'get', 'unarchive', 'updateFeedback'],
			},
		},
		default: '["finding-id-1", "finding-id-2"]',
		description: 'Array of finding IDs',
	},
	{
		displayName: 'Feedback',
		name: 'feedback',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['updateFeedback'],
			},
		},
		options: [
			{ name: 'Useful', value: 'USEFUL' },
			{ name: 'Not Useful', value: 'NOT_USEFUL' },
		],
		default: 'USEFUL',
		description: 'Feedback for the findings',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Finding Criteria (JSON)',
				name: 'FindingCriteria',
				type: 'json',
				default: '{}',
				description: 'Filter criteria for findings',
			},
			{
				displayName: 'Max Results',
				name: 'MaxResults',
				type: 'number',
				default: 50,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
			{
				displayName: 'Sort Criteria (JSON)',
				name: 'SortCriteria',
				type: 'json',
				default: '{\n  "AttributeName": "severity",\n  "OrderBy": "DESC"\n}',
				description: 'Sort criteria for findings',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Sort Criteria (JSON)',
				name: 'SortCriteria',
				type: 'json',
				default: '{\n  "AttributeName": "severity",\n  "OrderBy": "DESC"\n}',
				description: 'Sort criteria for findings',
			},
		],
	},
];
