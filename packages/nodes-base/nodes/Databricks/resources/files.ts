import type { INodeProperties } from 'n8n-workflow';

export const filesOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['files'],
		},
	},
	options: [
		{
			name: 'Upload File',
			value: 'uploadFile',
			description: 'Upload a file to Databricks workspace',
			action: 'Upload a file',
			routing: {
				request: {
					method: 'PUT',
					url: '=/api/2.0/fs/files/{{$parameter.path}}',
					body: '={{$parameter.fileContents}}', // TODO: Fix this to use binary data
					headers: {
						'Content-Type': 'application/octet-stream',
					},
					qs: {
						overwrite: '={{$parameter.overwrite}}',
					},
				},
			},
		},
		{
			name: 'Get File',
			value: 'getFile',
			description: 'Get file content from Databricks workspace',
			action: 'Get a file',
			routing: {
				request: {
					method: 'GET',
					url: '=/api/2.0/fs/files/{{$parameter.path}}',
				},
			},
		},
		{
			name: 'Delete File',
			value: 'deleteFile',
			description: 'Delete a file from Databricks workspace',
			action: 'Delete a file',
			routing: {
				request: {
					method: 'DELETE',
					url: '=/api/2.0/fs/files/{{$parameter.path}}',
				},
			},
		},
		{
			name: 'Get File Info',
			value: 'getFileInfo',
			description: 'Get file metadata from Databricks workspace',
			action: 'Get file info',
			routing: {
				request: {
					method: 'GET',
					url: '=/api/2.0/fs/files/{{$parameter.path}}/metadata',
				},
			},
		},
		{
			name: 'List Directory',
			value: 'listDirectory',
			description: 'List directory contents in Databricks workspace',
			action: 'List a directory',
			routing: {
				request: {
					method: 'GET',
					url: '/api/2.0/fs/files/{{$parameter.path}}/directory',
					qs: {
						page_size: '={{$parameter.additionalFields?.pageSize}}',
						page_token: '={{$parameter.additionalFields?.pageToken}}',
					},
				},
			},
		},
	],
	default: 'listDirectory',
};

export const filesParameters: INodeProperties[] = [
	{
		displayName: 'Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['uploadFile', 'getFile', 'deleteFile', 'getFileInfo', 'listDirectory'],
			},
		},
		description:
			'The path where the file is located or will be uploaded in the Databricks workspace, e.g., "/Volumes/my-catalog/my-schema/my-volume/directory/file.txt"',
	},
	{
		displayName: 'File Contents',
		name: 'fileContents',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['uploadFile'],
			},
		},
		description: 'Contents of the file to upload',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['listDirectory', 'uploadFile'],
			},
		},
		options: [
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 1000,
				description: 'Number of files to return per page',
				displayOptions: {
					show: {
						'/operation': ['listDirectory'],
					},
				},
			},
			{
				displayName: 'Page Token',
				name: 'pageToken',
				type: 'string',
				default: '',
				description: 'Token for the next page of results',
				displayOptions: {
					show: {
						'/operation': ['listDirectory'],
					},
				},
			},
			{
				displayName: 'Overwrite',
				name: 'overwrite',
				type: 'boolean',
				default: false,
				description: 'Whether to overwrite an existing file',
				displayOptions: {
					show: {
						'/operation': ['uploadFile'],
					},
				},
			},
		],
	},
];
