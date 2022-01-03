import * as del from './delete';
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
					'employeeFile',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'del',
				description: 'Delete an employee file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download an employee file',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all employee files',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an employee file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload an employee file',
			},
		],
		default: 'del',
	},
	...del.description,
	...download.description,
	...getAll.description,
	...update.description,
	...upload.description,
];
