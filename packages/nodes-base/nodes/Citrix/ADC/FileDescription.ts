import { INodeProperties } from 'n8n-workflow';

export const fileDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				action: 'Download a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				action: 'Upload a file',
			},
		],
		default: 'upload',
		displayOptions: {
			show: {
				resource: [
					'file',
				],
			},
		},
	},
	// Upload --------------------------------------------------------------------------
	{
		displayName: 'File Location',
		name: 'fileLocation',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
			},
		},
		default: '/nsconfig/ssl/',
	},
	{
		displayName: 'Input Data Field Name',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
			},
		},
		default: 'data',
		description: 'The name of the incoming field containing the binary file data to be processed',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
			},
		},
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'Name of the file. It should not include filepath.',
			},
		],
	},
	// Delete, Download ---------------------------------------------------------------
	{
		displayName: 'File Location',
		name: 'fileLocation',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete', 'download' ],
				resource: ['file'],
			},
		},
		default: '/nsconfig/ssl/',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the file. It should not include filepath.',
		displayOptions: {
			show: {
				operation: ['delete', 'download' ],
				resource: ['file'],
			},
		},
	},
	{
		displayName: 'Put Output in Field',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		description:
			'The name of the output field to put the binary file data in',
		displayOptions: {
			show: {
				operation: ['download' ],
				resource: ['file'],
			},
		},
	},
];
