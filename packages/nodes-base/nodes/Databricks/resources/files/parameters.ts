import type { INodeProperties } from 'n8n-workflow';

export const filesParameters: INodeProperties[] = [
	{
		displayName: 'Volume Path',
		name: 'volumePath',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'catalog.schema.volume',
		description: 'Full path to the volume in format: catalog.schema.volume',
		displayOptions: {
			show: {
				resource: ['files'],
			},
		},
	},
	{
		displayName: 'File Path',
		name: 'filePath',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['uploadFile', 'downloadFile', 'deleteFile', 'getFileInfo'],
			},
		},
		description:
			'Path to the file within the volume (e.g. "folder/file.txt" or "file.txt"). Do not include leading slash.',
		placeholder: 'folder/file.txt',
	},
	{
		displayName: 'Input Data Field Name',
		name: 'dataFieldName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Name of the field from input that contains the binary data to be uploaded',
		displayOptions: {
			show: {
				resource: ['files'],
				operation: ['uploadFile'],
			},
		},
	},

	{
		displayName: 'Directory Path',
		name: 'directoryPath',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['createDirectory', 'deleteDirectory'],
			},
		},
		description:
			'Path to directory within the volume (e.g. "folder1" or "folder1/subfolder"). Do not include leading slash.',
		placeholder: 'folder1',
	},
	{
		displayName: 'Directory Path',
		name: 'directoryPath',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['listDirectory'],
			},
		},
		description:
			'Path to directory within the volume (e.g. "folder1" or "folder1/subfolder"). Leave empty to list the volume root. Do not include leading slash.',
		placeholder: 'folder1',
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
				typeOptions: { password: true },
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
