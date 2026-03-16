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
			name: 'Create Directory',
			value: 'createDirectory',
			description: 'Create a directory in volume',
			action: 'Create a directory',
		},
		{
			name: 'Delete Directory',
			value: 'deleteDirectory',
			description: 'Delete a directory in volume',
			action: 'Delete a directory',
		},
		{
			name: 'Delete File',
			value: 'deleteFile',
			description: 'Delete a file from Databricks workspace',
			action: 'Delete a file',
		},
		{
			name: 'Download File',
			value: 'downloadFile',
			description: 'Download file content from Databricks workspace',
			action: 'Download a file',
		},
		{
			name: 'Get File Metadata',
			value: 'getFileInfo',
			description: 'Get file metadata from Databricks workspace',
			action: 'Get file info',
		},
		{
			name: 'List Directory',
			value: 'listDirectory',
			description: 'List directory contents in volume',
			action: 'List a directory',
		},
		{
			name: 'Upload File',
			value: 'uploadFile',
			description: 'Upload a file (up to 5 GiB) to Databricks volumes',
			action: 'Upload a file',
			routing: {
				request: {
					method: 'PUT',
					url: '=/api/2.0/fs/files/Volumes/{{$parameter.catalog}}/{{$parameter.schema}}/{{$parameter.volume}}/{{$parameter.path}}',
					body: '={{$binary[$parameter.dataFieldName].data}}',
					headers: {
						'Content-Type': 'application/octet-stream',
					},
					encoding: 'arraybuffer',
				},
			},
		},
	],
	default: 'listDirectory',
};
