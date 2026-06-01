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
			description: 'Delete a file from a volume',
			action: 'Delete a file',
		},
		{
			name: 'Download File',
			value: 'downloadFile',
			description: 'Download file content from a volume',
			action: 'Download a file',
		},
		{
			name: 'Get File Metadata',
			value: 'getFileInfo',
			description: 'Get file metadata from a volume',
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
		},
	],
	default: 'listDirectory',
};
