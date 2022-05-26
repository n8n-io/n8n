import { INodeProperties } from 'n8n-workflow';

export const certificateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Upload',
				value: 'upload',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Download',
				value: 'download',
			},
		],
		default: 'upload',
		displayOptions: {
			show: {
				resource: ['certificate'],
			},
		},
	},
	// Upload --------------------------------------------------------------------------
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['certificate'],
			},
		},
		default: 'data',
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
				resource: ['certificate'],
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
			{
				displayName: 'File Encoding',
				name: 'fileEncoding',
				type: 'string',
				default: 'BASE64',
				description: 'Encoding type of the file content',
			},
			{
				displayName: 'Partition',
				name: 'partition',
				type: 'options',
				default: 'default',
				typeOptions: {
					loadOptionsMethod: 'getPartitions',
				},
				description: 'Name of the partition',
			},
		],
	},
	// Delete, Download ---------------------------------------------------------------
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
				resource: ['certificate'],
			},
		},
	},
	{
		displayName: 'Partition',
		name: 'partition',
		type: 'options',
		default: '/nsconfig/ssl/',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getPartitions',
		},
		description: 'Name of the partition',
		displayOptions: {
			show: {
				operation: ['delete', 'download'],
				resource: ['certificate'],
			},
		},
	},
];
