import * as del from './del';
import * as download from './download';
import * as getAll from './getAll';
import * as update from './update';
import * as upload from './upload';

import {
	INodeProperties,
} from 'n8n-workflow';

export {
	del,
	download,
	getAll,
	update,
	upload,
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'file',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a company file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a company file',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all company files',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a company file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a company file',
			},
		],
		default: 'delete',
		description: '',
	},
	...del.description,
	...download.description,
	...getAll.description,
	...update.description,
	...upload.description,
];
