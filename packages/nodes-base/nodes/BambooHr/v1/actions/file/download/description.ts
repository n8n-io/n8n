import {
	FileProperties,
} from '../../Interfaces';

export const fileDownloadDescription: FileProperties = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'ID of the file',
	},
	{
		displayName: 'Put Output In Field',
		name: 'output',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The name of the output field to put the binary file data in',
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'file',
				],
			},
		},
	},
];
