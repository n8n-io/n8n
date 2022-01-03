import * as del from './delete';
import * as download from './download';
import * as getAll from './getAll';
import * as update from './update';

import { 
	INodeProperties,
} from 'n8n-workflow';

export {
	del,
	download,
	getAll,
	update
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'companyFile',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'del',
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
				description: 'Upload a company file',
			},
		],
		default: 'del',
		description: '',
	},
	...del.description,
	...download.description,
	...getAll.description,
	...update.description,
];
