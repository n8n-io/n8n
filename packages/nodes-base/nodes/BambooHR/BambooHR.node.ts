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
        description: 'First name of the employee',
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

        if (Array.isArray(responseData)) {
          returnData.push.apply(returnData, responseData as IDataObject[]);
        } else {
          returnData.push(responseData as IDataObject);
        }
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