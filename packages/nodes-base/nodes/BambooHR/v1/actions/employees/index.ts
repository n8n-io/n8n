import * as create from './create';

import { INodeProperties } from 'n8n-workflow';

export {
	create,
};


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'employees',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
        description: 'Create an employee',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
	...create.description,
] as INodeProperties[];