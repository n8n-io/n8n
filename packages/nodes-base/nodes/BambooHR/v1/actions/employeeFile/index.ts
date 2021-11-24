import * as create from './create';
import * as del from './del';
import * as get from './get';
import * as getAll from './getAll';
import * as update from "./update";

import { INodeProperties } from 'n8n-workflow';

export {
  create,
  del,
  get,
  getAll,
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
          'employeeFile',
        ],
      },
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Add an employee file category',
      },
      {
        name: 'Delete',
        value: 'del',
        description: 'Delete an employee file',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get an Employee File',
      },
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Lists employee files and categories',
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an employee file',
      }
    ],
    default: 'create',
    description: '',
  },
  ...create.description,
  ...del.description,
  ...get.description,
  ...getAll.description,
  ...update.description
] as INodeProperties[];
