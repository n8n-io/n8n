import type { INodeProperties } from 'n8n-workflow';

const showOnlyForIssueCreate = {
	operation: ['create'],
	resource: ['issue'],
};

export const issueCreateDescription: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForIssueCreate,
		},
		description: 'The title of the issue',
		routing: {
			send: {
				type: 'body',
				property: 'title',
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		displayOptions: {
			show: showOnlyForIssueCreate,
		},
		description: 'The body of the issue',
		routing: {
			send: {
				type: 'body',
				property: 'body',
			},
		},
	},
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'collection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Label',
		},
		displayOptions: {
			show: showOnlyForIssueCreate,
		},
		default: { label: '' },
		options: [
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				description: 'Label to add to issue',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'labels',
				value: '={{$value.map((data) => data.label)}}',
			},
		},
	},
];
