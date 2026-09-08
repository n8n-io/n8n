/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, } from 'n8n-workflow';
import { awsApiRequest, awsApiRequestAllItems } from './GenericFunctions';
import { itemFields, itemOperations } from './ItemDescription';
import { adjustExpressionAttributeName, adjustExpressionAttributeValues, adjustPutItem, decodeItem, simplify, } from './utils';
import { awsNodeAuthOptions, awsNodeCredentials } from '../utils';
export class AwsDynamoDB {
    description = {
        displayName: 'AWS DynamoDB',
        name: 'awsDynamoDb',
        icon: 'file:dynamodb.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume the AWS DynamoDB API',
        schemaPath: 'Aws/DynamoDB',
        defaults: {
            name: 'AWS DynamoDB',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: awsNodeCredentials,
        properties: [
            awsNodeAuthOptions,
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Item',
                        value: 'item',
                    },
                ],
                default: 'item',
            },
            ...itemOperations,
            ...itemFields,
        ],
    };
    methods = {
        loadOptions: {
            async getTables() {
                const headers = {
                    'Content-Type': 'application/x-amz-json-1.0',
                    'X-Amz-Target': 'DynamoDB_20120810.ListTables',
                };
                const responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', {}, headers);
                return responseData.TableNames.map((table) => ({ name: table, value: table }));
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let responseData;
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'item') {
                    if (operation === 'upsert') {
                        // ----------------------------------
                        //             upsert
                        // ----------------------------------
                        // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
                        const eavUi = this.getNodeParameter('additionalFields.eavUi.eavValues', i, []);
                        const conditionExpession = this.getNodeParameter('additionalFields.conditionExpression', i, '');
                        const eanUi = this.getNodeParameter('additionalFields.eanUi.eanValues', i, []);
                        const body = {
                            TableName: this.getNodeParameter('tableName', i),
                        };
                        const expressionAttributeValues = adjustExpressionAttributeValues(eavUi);
                        if (Object.keys(expressionAttributeValues).length) {
                            body.ExpressionAttributeValues = expressionAttributeValues;
                        }
                        const expressionAttributeName = adjustExpressionAttributeName(eanUi);
                        if (Object.keys(expressionAttributeName).length) {
                            body.ExpressionAttributeNames = expressionAttributeName;
                        }
                        if (conditionExpession) {
                            body.ConditionExpression = conditionExpession;
                        }
                        const dataToSend = this.getNodeParameter('dataToSend', 0);
                        const autoParseNumbers = this.getNodeParameter('autoParseNumbers', i, true);
                        const item = {};
                        if (dataToSend === 'autoMapInputData') {
                            const incomingKeys = Object.keys(items[i].json);
                            const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i);
                            const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
                            for (const key of incomingKeys) {
                                if (inputsToIgnore.includes(key))
                                    continue;
                                item[key] = items[i].json[key];
                            }
                            body.Item = adjustPutItem(item, autoParseNumbers);
                        }
                        else {
                            const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []);
                            fields.forEach(({ fieldId, fieldValue }) => (item[fieldId] = fieldValue));
                            body.Item = adjustPutItem(item, autoParseNumbers);
                        }
                        const headers = {
                            'Content-Type': 'application/x-amz-json-1.0',
                            'X-Amz-Target': 'DynamoDB_20120810.PutItem',
                        };
                        responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);
                        responseData = item;
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //              delete
                        // ----------------------------------
                        // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html
                        const body = {
                            TableName: this.getNodeParameter('tableName', i),
                            Key: {},
                            ReturnValues: this.getNodeParameter('returnValues', 0),
                        };
                        const eavUi = this.getNodeParameter('additionalFields.expressionAttributeUi.expressionAttributeValues', i, []);
                        const eanUi = this.getNodeParameter('additionalFields.eanUi.eanValues', i, []);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const simple = this.getNodeParameter('simple', 0, false);
                        const keyValues = this.getNodeParameter('keysUi.keyValues', i, []);
                        for (const item of keyValues) {
                            let value = item.value;
                            // All data has to get send as string even numbers
                            // @ts-ignore
                            value = ![null, undefined].includes(value) ? value?.toString() : '';
                            body.Key[item.key] = { [item.type]: value };
                        }
                        const expressionAttributeValues = adjustExpressionAttributeValues(eavUi);
                        if (Object.keys(expressionAttributeValues).length) {
                            body.ExpressionAttributeValues = expressionAttributeValues;
                        }
                        const expressionAttributeName = adjustExpressionAttributeName(eanUi);
                        if (Object.keys(expressionAttributeName).length) {
                            body.ExpressionAttributeNames = expressionAttributeName;
                        }
                        const headers = {
                            'Content-Type': 'application/x-amz-json-1.0',
                            'X-Amz-Target': 'DynamoDB_20120810.DeleteItem',
                        };
                        if (additionalFields.conditionExpression) {
                            body.ConditionExpression = additionalFields.conditionExpression;
                        }
                        responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);
                        if (!Object.keys(responseData).length) {
                            responseData = { success: true };
                        }
                        else if (simple) {
                            responseData = decodeItem(responseData.Attributes);
                        }
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //              get
                        // ----------------------------------
                        // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html
                        const tableName = this.getNodeParameter('tableName', 0);
                        const simple = this.getNodeParameter('simple', 0, false);
                        const select = this.getNodeParameter('select', 0);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const eanUi = this.getNodeParameter('additionalFields.eanUi.eanValues', i, []);
                        const body = {
                            TableName: tableName,
                            Key: {},
                            Select: select,
                        };
                        Object.assign(body, additionalFields);
                        const expressionAttributeName = adjustExpressionAttributeName(eanUi);
                        if (Object.keys(expressionAttributeName).length) {
                            body.ExpressionAttributeNames = expressionAttributeName;
                        }
                        if (additionalFields.readType) {
                            body.ConsistentRead = additionalFields.readType === 'stronglyConsistentRead';
                        }
                        if (additionalFields.projectionExpression) {
                            body.ProjectionExpression = additionalFields.projectionExpression;
                        }
                        const keyValues = this.getNodeParameter('keysUi.keyValues', i, []);
                        for (const item of keyValues) {
                            let value = item.value;
                            // All data has to get send as string even numbers
                            // @ts-ignore
                            value = ![null, undefined].includes(value) ? value?.toString() : '';
                            body.Key[item.key] = { [item.type]: value };
                        }
                        const headers = {
                            'X-Amz-Target': 'DynamoDB_20120810.GetItem',
                            'Content-Type': 'application/x-amz-json-1.0',
                        };
                        responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);
                        responseData = responseData.Item;
                        if (simple && responseData) {
                            responseData = decodeItem(responseData);
                        }
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //             getAll
                        // ----------------------------------
                        // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
                        const eavUi = this.getNodeParameter('eavUi.eavValues', i, []);
                        const simple = this.getNodeParameter('simple', 0, false);
                        const select = this.getNodeParameter('select', 0);
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const scan = this.getNodeParameter('scan', 0);
                        const eanUi = this.getNodeParameter('options.eanUi.eanValues', i, []);
                        const body = {
                            TableName: this.getNodeParameter('tableName', i),
                        };
                        if (scan) {
                            const filterExpression = this.getNodeParameter('filterExpression', i);
                            if (filterExpression) {
                                body.FilterExpression = filterExpression;
                            }
                        }
                        else {
                            body.KeyConditionExpression = this.getNodeParameter('keyConditionExpression', i);
                        }
                        const { indexName, projectionExpression, filterExpression } = this.getNodeParameter('options', i);
                        const expressionAttributeName = adjustExpressionAttributeName(eanUi);
                        if (Object.keys(expressionAttributeName).length) {
                            body.ExpressionAttributeNames = expressionAttributeName;
                        }
                        const expressionAttributeValues = adjustExpressionAttributeValues(eavUi);
                        if (Object.keys(expressionAttributeValues).length) {
                            body.ExpressionAttributeValues = expressionAttributeValues;
                        }
                        if (indexName) {
                            body.IndexName = indexName;
                        }
                        if (projectionExpression && select !== 'COUNT') {
                            body.ProjectionExpression = projectionExpression;
                        }
                        if (filterExpression) {
                            body.FilterExpression = filterExpression;
                        }
                        if (select) {
                            body.Select = select;
                        }
                        const headers = {
                            'Content-Type': 'application/json',
                            'X-Amz-Target': scan ? 'DynamoDB_20120810.Scan' : 'DynamoDB_20120810.Query',
                        };
                        if (returnAll && select !== 'COUNT') {
                            responseData = await awsApiRequestAllItems.call(this, 'dynamodb', 'POST', '/', body, headers);
                        }
                        else {
                            body.Limit = this.getNodeParameter('limit', 0, 1);
                            responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);
                            if (select !== 'COUNT') {
                                responseData = responseData.Items;
                            }
                        }
                        if (simple) {
                            responseData = responseData.map(simplify);
                        }
                    }
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    returnData.push(...executionData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=AwsDynamoDB.node.js.map