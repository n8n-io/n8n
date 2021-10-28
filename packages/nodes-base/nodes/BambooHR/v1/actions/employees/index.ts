import * as create from './create';
import * as get from './get';
import * as getDirectory from './getDirectory';
import * as update from "./update";

import { INodeProperties } from 'n8n-workflow';

export {
	create,
  get,
  getDirectory,
  update
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
      {
        name: 'Get',
        value: 'get',
        description: 'Get basic employee information',
      },
      {
        name: 'Get Directory',
        value: 'getDirectory',
        description: 'Gets employee directory.',
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an employee',
      },
		],
		default: 'create',
		description: 'The operation to perform.',
	},
	...create.description,
  ...get.description,
  ...getDirectory.description,
  ...update.description
] as INodeProperties[];