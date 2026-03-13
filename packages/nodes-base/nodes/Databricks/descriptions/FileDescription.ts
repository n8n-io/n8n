import type { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Create Directory',
				value: 'createDir',
				description: 'Create a directory (and any missing parent directories)',
				action: 'Create a directory',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Delete Directory',
				value: 'deleteDir',
				description: 'Delete a directory',
				action: 'Delete a directory',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
				action: 'Download a file',
			},
			{
				name: 'Get Metadata',
				value: 'getMetadata',
				description: 'Get metadata for a file',
				action: 'Get file metadata',
			},
			{
				name: 'List Directory',
				value: 'listDir',
				description: 'List the contents of a directory',
				action: 'List a directory',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},
];

export const fileFields: INodeProperties[] = [
	// ----------------------------------------
	//              file: upload
	// ----------------------------------------
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description:
			'Absolute path to the file in the Databricks file system, e.g. <code>/Volumes/catalog/schema/volume/file.csv</code>',
		placeholder: '/Volumes/my_catalog/my_schema/my_volume/data.csv',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description: 'Name of the binary property that contains the file data to upload',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
	},

	// ----------------------------------------
	//              file: download
	// ----------------------------------------
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description: 'Absolute path to the file to download',
		placeholder: '/Volumes/my_catalog/my_schema/my_volume/data.csv',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
	},
	{
		displayName: 'Output Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description: 'Name of the binary property to write the downloaded file data to',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
	},

	// ----------------------------------------
	//              file: delete
	// ----------------------------------------
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description: 'Absolute path to the file to delete',
		placeholder: '/Volumes/my_catalog/my_schema/my_volume/data.csv',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//           file: getMetadata
	// ----------------------------------------
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description: 'Absolute path to the file',
		placeholder: '/Volumes/my_catalog/my_schema/my_volume/data.csv',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['getMetadata'],
			},
		},
	},

	// ----------------------------------------
	//              file: listDir
	// ----------------------------------------
	{
		displayName: 'Directory Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description: 'Absolute path to the directory to list',
		placeholder: '/Volumes/my_catalog/my_schema/my_volume/',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['listDir'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['listDir'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				default: 1000,
				description: 'Maximum number of entries to return (max 1000)',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
			},
			{
				displayName: 'Page Token',
				name: 'pageToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Pagination token from a previous response',
			},
		],
	},

	// ----------------------------------------
	//            file: createDir
	// ----------------------------------------
	{
		displayName: 'Directory Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description:
			'Absolute path of the directory to create. Parent directories are created automatically.',
		placeholder: '/Volumes/my_catalog/my_schema/my_volume/my_dir/',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['createDir'],
			},
		},
	},

	// ----------------------------------------
	//            file: deleteDir
	// ----------------------------------------
	{
		displayName: 'Directory Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description: 'Absolute path to the directory to delete',
		placeholder: '/Volumes/my_catalog/my_schema/my_volume/my_dir/',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['deleteDir'],
			},
		},
	},
];
