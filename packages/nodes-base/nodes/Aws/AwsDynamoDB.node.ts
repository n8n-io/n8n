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
      return Array(attribute.map(decodeItem));
    case 'N':
      return Number(attribute);
    case 'BOOL':
      return Boolean(attribute);
  }
}

function decodeItem(item: any): any {
  const _item: any = {};
  for (const entry of Object.entries(item)) {
    const [attribute, value]: [string, any] = entry;
    const [type, content]: [string, any] = Object.entries(value)[0];
    _item[attribute] = decodeAttribute(type, content);
  }

  return _item;
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
                description: 'Handle single Items',
              },
              {
                name: 'Query',
                value: 'query',
                description: 'Query database',
              },
              {
                name: 'Scan',
                value: 'scan',
                description: 'Scan a table',
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
                resource: ['item', 'query', 'scan'],
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
          },
          {
            displayName: 'Key Condition Expression',
            name: 'key-condition-expression',
            type: 'string',
            required: true,
            displayOptions: {
              show: {
                resource: ['query']
              }
            },
            placeholder: 'id = :id',
            default: '',
            description: 'A string that determines the items to be read from the table or index.'
          },
          {
            displayName: 'Expression Attribute Values',
            name: 'expression-attribute-values',
            type: 'json',
            required: true,
            displayOptions: {
              show: {
                resource: ['query']
              }
            },
            placeholder: '{"id": {"S": "abc"}}',
            default: '',
            description: 'Attributes'
          },
          {
            displayName: 'Projection Expression',
            name: 'projection-expression',
            type: 'string',
            displayOptions: {
              show: {
                resource: ['query', 'scan']
              }
            },
            placeholder: 'id, name',
            default: '',
            description: 'Attributes to select'
          },

        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const resource = this.getNodeParameter('resource', 0) as string;

        if (resource === 'item') {
          const operation = this.getNodeParameter('operation', 0) as string;
          if (operation === 'get') {
            const TableName = this.getNodeParameter('table', 0) as string;
            const item = this.getNodeParameter('item', 0) as string;

            const body = {
              TableName: TableName,
              Key: {id: {S: item}},
            };

            const headers = {
              'X-Amz-Target': 'DynamoDB_20120810.GetItem',
              'Content-Type': 'application/x-amz-json-1.0'
            };
            const response = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers)

            return [this.helpers.returnJsonArray(decodeItem(response.Item))];
          }
        }

        if (resource === 'query') {
          const TableName = this.getNodeParameter('table', 0) as string;
          const KeyConditionExpression = this.getNodeParameter('key-condition-expression', 0) as string;
          const ExpressionAttributeValues = this.getNodeParameter('expression-attribute-values', 0) as string;
          const ProjectionExpression = this.getNodeParameter('projection-expression', 0) as string;

          const body: any = {
            TableName,
            KeyConditionExpression,
            ExpressionAttributeValues: JSON.parse(ExpressionAttributeValues),
            ConsistentRead: true
          };

          if (ProjectionExpression) {
            body.ProjectionExpression = ProjectionExpression;
          }

          const headers = {
            'X-Amz-Target': 'DynamoDB_20120810.Query',
            'Content-Type': 'application/x-amz-json-1.0'
          };
          const response = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers)
          const items = response.Items.map(decodeItem);

          return [this.helpers.returnJsonArray(items)];
        }

        if (resource === 'scan') {
          const TableName = this.getNodeParameter('table', 0) as string;
          const ProjectionExpression = this.getNodeParameter('projection-expression', 0) as string;

          const body: any = {
            TableName,
            ConsistentRead: true
          };

          if (ProjectionExpression) {
            body.ProjectionExpression = ProjectionExpression;
          }

          const headers = {
            'X-Amz-Target': 'DynamoDB_20120810.Scan',
            'Content-Type': 'application/x-amz-json-1.0'
          };
          const response = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers)
          const items = response.Items.map(decodeItem);

          return [this.helpers.returnJsonArray(items)];
        }

        return [[]];
    }
}
