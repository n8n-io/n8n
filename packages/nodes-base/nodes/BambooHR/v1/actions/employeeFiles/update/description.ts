import {
  EmployeeFilesProperties,
} from '../../Interfaces';

export const employeeFilesUpdateDescription: EmployeeFilesProperties = [
  {
    displayName: 'Employee ID',
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
    displayName: 'File ID',
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
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
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
    options: [
      {
        displayName: 'Category ID',
        name: 'categoryId',
        type: 'string',
        default: '',
        description: 'Move the file to a different category',
      },
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        description: 'New name of the category',
      },
      {
        displayName: 'Share with employee',
        name: 'shareWithEmployee',
        type: 'options',
        options: [
          {
            name: 'Yes',
            value: 'yes',
          },
          {
            name: 'No',
            value: 'no',
          },
        ],
        default: '',
        description: 'Update whether this file is shared or not',
      },
    ],
  }
];
