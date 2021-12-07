import * as addCategory from './addCategory';
import * as del from './del';
import * as get from './get';
import * as getAll from './getAll';
import * as update from "./update";

import { INodeProperties } from 'n8n-workflow';

export {
  addCategory,
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
          'companyFile',
        ],
      },
    },
    options: [
      {
        name: 'Add Category',
        value: 'addCategory',
        description: 'Add a company file category',
      },
      {
        name: 'Delete',
        value: 'del',
        description: 'Delete a company file',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Gets an company file',
      },
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Lists company files and categories',
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Upload a company file',
      },
    ],
    default: 'addCategory',
    description: '',
  },
  ...addCategory.description,
  ...del.description,
  ...get.description,
  ...getAll.description,
  ...update.description
] as INodeProperties[];
