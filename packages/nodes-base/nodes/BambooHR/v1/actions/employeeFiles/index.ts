import * as create from './create';
// import * as delete from './delete';
// import * as get from './get';
// import * as getAll from './getAll';
// import * as update from "./update";

import { INodeProperties } from 'n8n-workflow';

export {
	create,
  // delete,
  // get,
  // getAll,
  // update
};


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'employeeFiles',
				],
			},
		},
		options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Add an employee file category',
      },
      // {
      //   name: 'Delete',
      //   value: 'delete',
      //   description: 'Delete an employee file',
      // },
      // {
      //   name: 'Get',
      //   value: 'get',
      //   description: 'Get an Employee File',
      // },
      // {
      //   name: 'Get All',
      //   value: 'getAll',
      //   description: 'Lists employee files and categories',
      // },
      // {
      //   name: 'Update',
      //   value: 'update',
      //   description: 'Update an employee file',
      // }
		],
		default: 'create',
    description: 'Add an employee file category',
	},
	...create.description,
  // ...delete.description,
  // ...get.description,
  // ...getAll.description,
  // ...update.description
] as INodeProperties[];