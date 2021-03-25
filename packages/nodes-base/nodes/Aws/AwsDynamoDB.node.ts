import {IExecuteFunctions} from 'n8n-core';
import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import { awsApiRequestREST } from './GenericFunctions';

function decodeAttribute(type: string, attribute: any): any {
  switch (type) {
    case 'S':
      return String(attribute);
    case 'SS':
    case 'M':
    case 'L':
    case 'NS':
      return Array(...attribute);
    case 'N':
      return Number(attribute);
    case 'BOOL':
      return Boolean(attribute);
  }
}

export class AwsDynamoDB implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'AWS DynamoDB',
        name: 'awsDynamoDb',
        icon: 'file:dynamodb.svg',
        group: ['transform'],
        version: 1,
        description: 'Query data on AWS DynamoDB',
        defaults: {
            name: 'AWS DynamoDB',
            color: '#2273b9',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
          {
            name: 'aws',
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
                name: 'Item',
                value: 'item',
                description: 'Query Items',
              },
              {
                name: 'Query',
                value: 'query',
                description: 'Invoke a function',
              },
            ],
            default: 'item',
            description: 'The resource to operate on.',
          },
          {
            displayName: 'Operation',
            name: 'operation',
            type: 'options',
            displayOptions: {
              show: {
                resource: ['item'],
              }
            },
            options: [
              {
                name: 'GetItem',
                value: 'get',
                description: 'Read an item.',
              },
            ],
            default: 'get',
            description: 'The operation to perform.',
          },
          {
            displayName: 'Table',
            name: 'table',
            type: 'string',
            required: true,
            displayOptions: {
              show: {
                resource: ['item', 'query'],
              }
            },
            default: '',
            description: 'Specify the table you want to operate on',
          },
          {
            displayName: 'Item',
            name: 'item',
            type: 'string',
            required: true,
            displayOptions: {
              show: {
                resource: ['item'],
                operation: ['get'],
              }
            },
            default: '',
            description: 'Specify the Item you want to operate on',
          }
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;

        if (resource === 'item') {
          if (operation === 'get') {
            const table = this.getNodeParameter('table', 0) as string;
            const item = this.getNodeParameter('item', 0) as string;

            const body = {
              TableName: table,
              Key: {id: {S: item}},
            };

            const headers = {
              'X-Amz-Target': 'DynamoDB_20120810.GetItem',
              'Content-Type': 'application/x-amz-json-1.0'
            };
            const response = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers)

            const _item: any = {};
            for (const [attribute, value] of Object.entries(response.Item)) {
              const [type, content] = Object.entries(value)[0];
              _item[attribute] = decodeAttribute(type, content);
            }

            return [this.helpers.returnJsonArray(_item)];
          }

        }

        return [[]];
    }
}
