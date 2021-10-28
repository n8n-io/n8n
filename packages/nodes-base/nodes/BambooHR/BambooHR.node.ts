import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import {
  apiRequest,
  createUri
} from './GenericFunctions';

export class BambooHR implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'BambooHR',
    name: 'bambooHR',
    icon: 'file:bambooHR.svg',
    group: ['transform'],
    version: 1,
    description: 'Consume BambooHR API',
    defaults: {
      name: 'BambooHR',
      color: '#73c41d',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'bambooHRApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
          {
            name: 'Employees',
            value: 'employees',
          },
          {
            name: 'Employee Files',
            value: 'employeeFiles',
          },
          {
            name: 'Company Files',
            value: 'companyFiles',
          },
        ],
        default: 'employees',
        required: true,
        description: 'Resource to consume',
      },

      // ----------------------------------
      //         Employee
      // ----------------------------------
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
          show: {
            resource: [
              'employees'
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
        description: 'Create an employee',
      },
      {
        displayName: 'Company Name',
        name: 'companyName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: [
              'create',
              'get',
              'getDirectory',
              'update'
            ],
            resource: [
              'employees',
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
              'get',
              'update'
            ],
            resource: [
              'employees',
            ],
          },
        },
        default: '',
        description: 'Id of the employee',
      },
      {
        displayName: 'Fields',
        name: 'fields',
        type: 'string',
        required: false,
        displayOptions: {
          show: {
            operation: [
              'get',
            ],
            resource: [
              'employees',
            ],
          },
        },
        default: 'displayName,firstName,lastName,preferredName,jobTitle,workPhone,mobilePhone,workEmail,department,location,division,facebook,linkedIn,twitterFeed,pronouns,workPhoneExtension,supervisor,photoUrl',
        description: 'Set of fields to get from employee data, separated by coma',
      },
      {
        displayName: 'First Name',
        name: 'firstName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: [
              'create',
              'update'
            ],
            resource: [
              'employees',
            ],
          },
        },
        default: '',
        description: 'First name of the employee',
      },
      {
        displayName: 'Last Name',
        name: 'lastName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: [
              'create',
              'update'
            ],
            resource: [
              'employees',
            ],
          },
        },
        default: '',
        description: 'Last name of the employee',
      },

      // ----------------------------------
      //         Employee Files
      // ----------------------------------
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
          show: {
            resource: [
              'employeeFiles'
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
            value: 'delete',
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
          },
          {
            name: 'Upload',
            value: 'upload',
            description: 'Upload an employee file',
          },
        ],
        default: 'create',
        description: 'Create an employee',
      },
      {
        displayName: 'Company Name',
        name: 'companyName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: [
              'create',
              'delete',
              'get',
              'getAll',
              'update',
              'upload'
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
              'delete',
              'get',
              'getAll',
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
              'delete',
              'get',
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
        displayName: 'Category Name',
        name: 'categoryName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: [
              'create'
            ],
            resource: [
              'employeeFiles',
            ],
          },
        },
        default: '',
        description: 'Name of the new employee file category',
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

      // ----------------------------------
      //         Company Files
      // ----------------------------------
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
          show: {
            resource: [
              'companyFiles'
            ],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Add a company file category',
          },
          {
            name: 'Delete',
            value: 'delete',
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
          {
            name: 'Upload',
            value: 'upload',
            description: 'Upload an employee file',
          },
        ],
        default: 'create',
        description: 'Create an employee',
      },
      {
        displayName: 'Company Name',
        name: 'companyName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: [
              'create',
              'delete',
              'get',
              'getAll',
              'update',
              'upload'
            ],
            resource: [
              'companyFiles',
            ],
          },
        },
        default: '',
        description: 'Company name',
      },
      {
        displayName: 'File Id',
        name: 'fileId',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: [
              'delete',
              'get',
              'update'
            ],
            resource: [
              'companyFiles',
            ],
          },
        },
        default: '',
        description: 'ID of the company file',
      },
      {
        displayName: 'Category Name',
        name: 'categoryName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: [
              'create'
            ],
            resource: [
              'companyFiles',
            ],
          },
        },
        default: '',
        description: 'Name of the new company files category',
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
              'companyFiles',
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
              'companyFiles',
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
              'companyFiles',
            ],
          },
        },
        default: '',
        description: 'Update whether this file is shared or not',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    let responseData;
    const returnData: IDataObject[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    const companyName = this.getNodeParameter('companyName', 0) as string;

    try {
      if (resource === 'employees') {
        if (operation === 'create') {
          // ----------------------------------
          //         employee:create
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#add-employee-1

          const method = 'POST';
          const endPoint = 'employees';

          const firstName = this.getNodeParameter('firstName', 0) as string;
          const lastName = this.getNodeParameter('lastName', 0) as string;

          const qs: IDataObject = {
            firstName,
            lastName
          }

          Object.assign(qs);

          const uri = await createUri.call(this, companyName, endPoint);
          responseData = await apiRequest.call(this, method, uri, qs);
        } else if (operation === 'get') {
          // ----------------------------------
          //         employee:get
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#get-employee

          const id = this.getNodeParameter('id', 0) as string;
          const fields = this.getNodeParameter('fields', 0) as string;

          const method = 'GET';
          const endPoint = 'employees';

          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${id}/?fields=${fields}`;
          responseData = await apiRequest.call(this, method, uri);
        } else if (operation === 'getDirectory') {
          // ----------------------------------
          //         employee:getDirectory
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#get-employees-directory-1

          const method = 'GET';
          const endPoint = 'employees/directory';

          const uri = await createUri.call(this, companyName, endPoint);
          responseData = await apiRequest.call(this, method, uri);
        } else if (operation === 'update') {
          // ----------------------------------
          //         employee:update
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#update-employee

          const id = this.getNodeParameter('id', 0) as string;

          const firstName = this.getNodeParameter('firstName', 0) as string;
          const lastName = this.getNodeParameter('lastName', 0) as string;

          const data: IDataObject = {
            firstName,
            lastName
          };

          Object.assign(data);

          const method = 'POST';
          const endPoint = 'employees';

          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${id}`;
          responseData = await apiRequest.call(this, method, uri, data);
        }
      } else if (resource === 'employeeFiles') {
        if (operation === 'create') {
          // ----------------------------------
          //         employeeFiles:create
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#add-employee-file-category-1

          const method = 'POST';
          const endPoint = 'employees/files/categories';

          const categoryName = this.getNodeParameter('categoryName', 0) as string;
          const qs: string[] = [];
          qs.push(categoryName);

          const uri = await createUri.call(this, companyName, endPoint);
          responseData = await apiRequest.call(this, method, uri, qs);
        } else if (operation === 'delete') {
          // ----------------------------------
          //         employeeFiles:delete
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#delete-employee-file-1

          const id = this.getNodeParameter('id', 0) as string;
          const fileId = this.getNodeParameter('id', 0) as string;

          const method = 'DELETE';
          const endPoint = 'employees';

          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${id}/files/${fileId}`;
          responseData = await apiRequest.call(this, method, uri);
        } else if (operation === 'get') {
          // ----------------------------------
          //         employeeFiles:get
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#get-employee-file-1

          const id = this.getNodeParameter('id', 0) as string;
          const fileId = this.getNodeParameter('fileId', 0) as string;

          const method = 'GET';
          const endPoint = 'employees';

          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${id}/files/${fileId}`;
          responseData = await apiRequest.call(this, method, uri);
        } else if (operation === 'getAll') {
          // ----------------------------------
          //         employeeFiles:getAll
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#list-employee-files-1

          const id = this.getNodeParameter('id', 0) as string;

          const method = 'GET';
          const endPoint = 'employees';

          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${id}/files/view/`;
          responseData = await apiRequest.call(this, method, uri);

        } else if (operation === 'update') {
          // ----------------------------------
          //         employeeFiles:update
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#update-employee-file-1

          const id = this.getNodeParameter('id', 0) as string;
          const fileId = this.getNodeParameter('id', 0) as string;

          const method = 'POST';
          const endPoint = 'employees';
          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${id}/files/${fileId}`;

          const name = this.getNodeParameter('name', 0) as string;
          const categoryId = this.getNodeParameter('categoryId', 0) as string;
          const shareWithEmployee = this.getNodeParameter('shareWithEmployee', 0) as string;

          const qs: IDataObject = {
            name,
            categoryId,
            shareWithEmployee
          };

          Object.assign(qs);

          responseData = await apiRequest.call(this, method, uri, qs);
        } else if (operation === 'upload') {
          // ----------------------------------
          //         employeeFiles:upload
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#upload-employee-file-1


        }
      } else if (resource === 'companyFiles') {

        if (operation === 'create') {
          // ----------------------------------
          //         companyFiles:create
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#add-company-file-category-1

          const method = 'POST';
          const endPoint = 'files/categories';

          const categoryName = this.getNodeParameter('categoryName', 0) as string;
          const qs: string[] = [];
          qs.push(categoryName);

          const uri = await createUri.call(this, companyName, endPoint);
          responseData = await apiRequest.call(this, method, uri, qs);
        } else if (operation === 'delete') {
          // ----------------------------------
          //         companyFiles:delete
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#delete-company-file-1

          const fileId = this.getNodeParameter('id', 0) as string;

          const method = 'DELETE';
          const endPoint = 'files';

          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${fileId}`;
          responseData = await apiRequest.call(this, method, uri);
        } else if (operation === 'get') {
          // ----------------------------------
          //         companyFiles:get
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#get-company-file-1
          const fileId = this.getNodeParameter('fileId', 0) as string;

          const method = 'GET';
          const endPoint = 'files';

          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${fileId}`;
          responseData = await apiRequest.call(this, method, uri);

        } else if (operation === 'getAll') {
          // ----------------------------------
          //         companyFiles:getAll
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#list-company-files-1

          const method = 'GET';
          const endPoint = 'files';

          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/view/`;
          responseData = await apiRequest.call(this, method, uri);
        } else if (operation === 'update') {
          // ----------------------------------
          //         companyFiles:update
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#update-company-file-1

          const fileId = this.getNodeParameter('id', 0) as string;

          const method = 'POST';
          const endPoint = 'files';
          const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${fileId}`;

          const name = this.getNodeParameter('name', 0) as string;
          const categoryId = this.getNodeParameter('categoryId', 0) as string;
          const shareWithEmployee = this.getNodeParameter('shareWithEmployee', 0) as string;

          const qs: IDataObject = {
            name,
            categoryId,
            shareWithEmployee
          };

          Object.assign(qs);

          responseData = await apiRequest.call(this, method, uri, qs);
        } else if (operation === 'upload') {
          // ----------------------------------
          //         companyFiles:upload
          // ----------------------------------
          // https://documentation.bamboohr.com/reference#upload-company-file-1

        }
      }

      if (Array.isArray(responseData)) {
        returnData.push.apply(returnData, responseData as IDataObject[]);
      } else {
        returnData.push(responseData as IDataObject);
      }
    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({ error: error.message });
      }
      throw error;
    }

    // Map data to n8n data
    return [this.helpers.returnJsonArray(returnData)];
  }
}