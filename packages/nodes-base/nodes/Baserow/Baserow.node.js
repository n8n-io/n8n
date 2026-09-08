import { NodeConnectionTypes, } from 'n8n-workflow';
import { baserowApiRequest, baserowApiRequestAllItems, formatBaserowFilterValue, normalizeFilterFieldId, TableFieldMapper, toOptions, } from './GenericFunctions';
import { operationFields } from './OperationDescription';
function getCredentialType(authentication) {
    return authentication === 'databaseToken' ? 'baserowTokenApi' : 'baserowApi';
}
export class Baserow {
    description = {
        displayName: 'Baserow',
        name: 'baserow',
        icon: 'file:baserow.svg',
        group: ['output'],
        version: [1, 1.1],
        description: 'Consume the Baserow API',
        subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
        defaults: {
            name: 'Baserow',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        usableAsTool: true,
        credentials: [
            {
                name: 'baserowApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['usernamePassword'],
                    },
                },
            },
            {
                name: 'baserowTokenApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['databaseToken'],
                    },
                },
            },
        ],
        properties: [
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Username & Password',
                        value: 'usernamePassword',
                    },
                    {
                        name: 'Database Token',
                        value: 'databaseToken',
                    },
                ],
                default: 'usernamePassword',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Row',
                        value: 'row',
                    },
                ],
                default: 'row',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['row'],
                    },
                },
                options: [
                    {
                        name: 'Batch Create',
                        value: 'batchCreate',
                        description: 'Create up to 200 rows in one request',
                        action: 'Create multiple rows',
                    },
                    {
                        name: 'Batch Delete',
                        value: 'batchDelete',
                        description: 'Delete up to 200 rows in one request',
                        action: 'Delete multiple rows',
                    },
                    {
                        name: 'Batch Update',
                        value: 'batchUpdate',
                        description: 'Update up to 200 rows in one request',
                        action: 'Update multiple rows',
                    },
                    {
                        name: 'Create',
                        value: 'create',
                        description: 'Create a row',
                        action: 'Create a row',
                    },
                    {
                        name: 'Delete',
                        value: 'delete',
                        description: 'Delete a row',
                        action: 'Delete a row',
                    },
                    {
                        name: 'Get',
                        value: 'get',
                        description: 'Retrieve a row',
                        action: 'Get a row',
                    },
                    {
                        name: 'Get Many',
                        value: 'getAll',
                        description: 'Retrieve many rows',
                        action: 'Get many rows',
                    },
                    {
                        name: 'Update',
                        value: 'update',
                        description: 'Update a row',
                        action: 'Update a row',
                    },
                ],
                default: 'getAll',
            },
            ...operationFields,
        ],
    };
    methods = {
        loadOptions: {
            async getDatabaseIds() {
                const credentialType = getCredentialType(this.getNodeParameter('authentication', 0));
                const endpoint = '/api/applications/';
                const databases = (await baserowApiRequest.call(this, 'GET', endpoint, credentialType));
                return toOptions(databases.filter((database) => database.type === 'database'));
            },
            async getTableIds() {
                const authentication = this.getNodeParameter('authentication', 0);
                const credentialType = getCredentialType(authentication);
                let endpoint;
                if (authentication === 'databaseToken') {
                    endpoint = '/api/database/tables/all-tables/';
                }
                else {
                    const databaseId = this.getNodeParameter('databaseId', 0);
                    endpoint = `/api/database/tables/database/${databaseId}/`;
                }
                const tables = (await baserowApiRequest.call(this, 'GET', endpoint, credentialType));
                return toOptions(tables);
            },
            async getTableFields() {
                const credentialType = getCredentialType(this.getNodeParameter('authentication', 0));
                const tableId = this.getNodeParameter('tableId', 0);
                const endpoint = `/api/database/fields/table/${tableId}/`;
                const fields = (await baserowApiRequest.call(this, 'GET', endpoint, credentialType));
                return toOptions(fields);
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const mapper = new TableFieldMapper();
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        const tableId = this.getNodeParameter('tableId', 0);
        const credentialType = getCredentialType(this.getNodeParameter('authentication', 0));
        const fields = await mapper.getTableFields.call(this, tableId, credentialType);
        mapper.createMappings(fields);
        if (operation === 'batchCreate') {
            // ----------------------------------
            //           batchCreate
            // ----------------------------------
            // https://api.baserow.io/api/redoc/#tag/Database-table-rows/operation/batch_create_database_table_rows
            const dataToSend = this.getNodeParameter('dataToSend', 0);
            const itemsPayload = [];
            if (dataToSend === 'autoMapInputData') {
                for (let i = 0; i < items.length; i++) {
                    const body = {};
                    const incomingKeys = Object.keys(items[i].json);
                    const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i);
                    const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
                    for (const key of incomingKeys) {
                        if (inputDataToIgnore.includes(key))
                            continue;
                        body[key] = items[i].json[key];
                        mapper.namesToIds(body);
                    }
                    itemsPayload.push(body);
                }
            }
            else {
                const rowsUi = this.getNodeParameter('rowsUi.rowValues', 0, []);
                for (const row of rowsUi) {
                    const body = {};
                    for (const field of row.fieldsUi.fieldValues) {
                        body[`field_${field.fieldId}`] = field.fieldValue;
                    }
                    itemsPayload.push(body);
                }
            }
            const endpoint = `/api/database/rows/table/${tableId}/batch/`;
            const response = await baserowApiRequest.call(this, 'POST', endpoint, credentialType, {
                items: itemsPayload,
            });
            response.items.forEach((row) => mapper.idsToNames(row));
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(response.items), { itemData: { item: 0 } });
            returnData.push.apply(returnData, executionData);
            return [returnData];
        }
        if (operation === 'batchUpdate') {
            // ----------------------------------
            //           batchUpdate
            // ----------------------------------
            // https://api.baserow.io/api/redoc/#tag/Database-table-rows/operation/batch_update_database_table_rows
            const dataToSend = this.getNodeParameter('dataToSend', 0);
            const itemsPayload = [];
            if (dataToSend === 'autoMapInputData') {
                for (let i = 0; i < items.length; i++) {
                    const body = {};
                    body.id = items[i].json.id;
                    const incomingKeys = Object.keys(items[i].json);
                    const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i);
                    const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
                    for (const key of incomingKeys) {
                        if (inputDataToIgnore.includes(key))
                            continue;
                        body[key] = items[i].json[key];
                        mapper.namesToIds(body);
                    }
                    itemsPayload.push(body);
                }
            }
            else {
                const rowsUi = this.getNodeParameter('rowsUi.rowValues', 0, []);
                for (const row of rowsUi) {
                    const body = { id: row.id };
                    for (const field of row.fieldsUi.fieldValues) {
                        body[`field_${field.fieldId}`] = field.fieldValue;
                    }
                    itemsPayload.push(body);
                }
            }
            const endpoint = `/api/database/rows/table/${tableId}/batch/`;
            const response = await baserowApiRequest.call(this, 'PATCH', endpoint, credentialType, {
                items: itemsPayload,
            });
            response.items.forEach((row) => mapper.idsToNames(row));
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(response.items), { itemData: { item: 0 } });
            returnData.push.apply(returnData, executionData);
            return [returnData];
        }
        if (operation === 'batchDelete') {
            // ----------------------------------
            //           batchDelete
            // ----------------------------------
            // https://api.baserow.io/api/redoc/#tag/Database-table-rows/operation/batch_delete_database_table_rows
            const dataToSend = this.getNodeParameter('dataToSend', 0);
            let ids;
            if (dataToSend === 'autoMapInputData') {
                const propertyName = this.getNodeParameter('rowIdProperty', 0);
                ids = items.map((item) => {
                    return String(item.json[propertyName]);
                });
            }
            else {
                ids = this.getNodeParameter('rowIds', 0);
            }
            const endpoint = `/api/database/rows/table/${tableId}/batch-delete/`;
            await baserowApiRequest.call(this, 'POST', endpoint, credentialType, { items: ids });
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray([{ success: true, deleted: ids }]), { itemData: { item: 0 } });
            returnData.push(...executionData);
            return [returnData];
        }
        for (let i = 0; i < items.length; i++) {
            try {
                if (operation === 'getAll') {
                    // ----------------------------------
                    //             getAll
                    // ----------------------------------
                    // https://api.baserow.io/api/redoc/#operation/list_database_table_rows
                    const { order, filters, filterType, search } = this.getNodeParameter('additionalOptions', i);
                    const qs = {};
                    if (order?.fields) {
                        qs.order_by = order.fields
                            .map(({ field, direction }) => `${direction}${mapper.setField(field)}`)
                            .join(',');
                    }
                    if (filters?.fields) {
                        filters.fields.forEach(({ field, operator, value, timezone }) => {
                            const fieldId = normalizeFilterFieldId(mapper.setField(field));
                            qs[`filter__field_${fieldId}__${operator}`] = formatBaserowFilterValue(operator, value, timezone ?? 'UTC');
                        });
                    }
                    if (filterType) {
                        qs.filter_type = filterType;
                    }
                    if (search) {
                        qs.search = search;
                    }
                    const endpoint = `/api/database/rows/table/${tableId}/`;
                    const rows = (await baserowApiRequestAllItems.call(this, 'GET', endpoint, credentialType, {}, qs));
                    rows.forEach((row) => mapper.idsToNames(row));
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(rows), { itemData: { item: i } });
                    returnData.push.apply(returnData, executionData);
                }
                else if (operation === 'get') {
                    // ----------------------------------
                    //             get
                    // ----------------------------------
                    // https://api.baserow.io/api/redoc/#operation/get_database_table_row
                    const rowId = this.getNodeParameter('rowId', i);
                    const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
                    const row = await baserowApiRequest.call(this, 'GET', endpoint, credentialType);
                    mapper.idsToNames(row);
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(row), { itemData: { item: i } });
                    returnData.push.apply(returnData, executionData);
                }
                else if (operation === 'create') {
                    // ----------------------------------
                    //             create
                    // ----------------------------------
                    // https://api.baserow.io/api/redoc/#operation/create_database_table_row
                    const body = {};
                    const dataToSend = this.getNodeParameter('dataToSend', 0);
                    if (dataToSend === 'autoMapInputData') {
                        const incomingKeys = Object.keys(items[i].json);
                        const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i);
                        const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
                        for (const key of incomingKeys) {
                            if (inputDataToIgnore.includes(key))
                                continue;
                            body[key] = items[i].json[key];
                            mapper.namesToIds(body);
                        }
                    }
                    else {
                        const fieldsUi = this.getNodeParameter('fieldsUi.fieldValues', i, []);
                        for (const field of fieldsUi) {
                            body[`field_${field.fieldId}`] = field.fieldValue;
                        }
                    }
                    const endpoint = `/api/database/rows/table/${tableId}/`;
                    const createdRow = await baserowApiRequest.call(this, 'POST', endpoint, credentialType, body);
                    mapper.idsToNames(createdRow);
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(createdRow), { itemData: { item: i } });
                    returnData.push.apply(returnData, executionData);
                }
                else if (operation === 'update') {
                    // ----------------------------------
                    //             update
                    // ----------------------------------
                    // https://api.baserow.io/api/redoc/#operation/update_database_table_row
                    const rowId = this.getNodeParameter('rowId', i);
                    const body = {};
                    const dataToSend = this.getNodeParameter('dataToSend', 0);
                    if (dataToSend === 'autoMapInputData') {
                        const incomingKeys = Object.keys(items[i].json);
                        const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i);
                        const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
                        for (const key of incomingKeys) {
                            if (inputsToIgnore.includes(key))
                                continue;
                            body[key] = items[i].json[key];
                            mapper.namesToIds(body);
                        }
                    }
                    else {
                        const fieldsUi = this.getNodeParameter('fieldsUi.fieldValues', i, []);
                        for (const field of fieldsUi) {
                            body[`field_${field.fieldId}`] = field.fieldValue;
                        }
                    }
                    const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
                    const updatedRow = await baserowApiRequest.call(this, 'PATCH', endpoint, credentialType, body);
                    mapper.idsToNames(updatedRow);
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(updatedRow), { itemData: { item: i } });
                    returnData.push.apply(returnData, executionData);
                }
                else if (operation === 'delete') {
                    // ----------------------------------
                    //             delete
                    // ----------------------------------
                    // https://api.baserow.io/api/redoc/#operation/delete_database_table_row
                    const rowId = this.getNodeParameter('rowId', i);
                    const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
                    await baserowApiRequest.call(this, 'DELETE', endpoint, credentialType);
                    const executionData = this.helpers.constructExecutionMetaData([{ json: { success: true } }], { itemData: { item: i } });
                    returnData.push.apply(returnData, executionData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message, json: {}, itemIndex: i });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Baserow.node.js.map