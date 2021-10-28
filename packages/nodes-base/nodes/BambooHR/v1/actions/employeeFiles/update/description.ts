import {
  EmployeeFilesProperties,
} from '../../Interfaces';

export const employeeFilesUpdateDescription: EmployeeFilesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'Company name',
  },
  {
    displayName: 'Id',
    name: 'id',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'Id of the employee',
  },
  {
    displayName: 'File Id',
    name: 'fileId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'ID of the employee file',
  },
  {
    displayName: 'Name',
    name: 'name',
    type: 'string',
    required: false,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'New name of the category',
  },
  {
    displayName: 'Category ID',
    name: 'categoryId',
    type: 'string',
    required: false,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'Move the file to a different category',
  },
  {
    displayName: 'Share with employee',
    name: 'shareWithEmployee',
    type: 'string',
    required: false,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'Update whether this file is shared or not',
  },
];
