import { NodeConnectionTypes, jsonParse, NodeOperationError } from 'n8n-workflow';
import { companyFields, companyOperations } from './CompanyDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { dealFields, dealOperations } from './DealDescription';
import { agileCrmApiRequest, agileCrmApiRequestAllItems, agileCrmApiRequestUpdate, getFilterRules, simplifyResponse, validateJSON, } from './GenericFunctions';
export class AgileCrm {
    description = {
        displayName: 'Agile CRM',
        name: 'agileCrm',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:agilecrm.png',
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        group: ['transform'],
        version: 1,
        description: 'Consume Agile CRM API',
        defaults: {
            name: 'Agile CRM',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'agileCrmApi',
                required: true,
            },
        ],
        properties: [
            // Node properties which the user gets displayed and
            // can change on the node.
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Company',
                        value: 'company',
                    },
                    {
                        name: 'Contact',
                        value: 'contact',
                    },
                    {
                        name: 'Deal',
                        value: 'deal',
                    },
                ],
                default: 'contact',
            },
            // CONTACT
            ...contactOperations,
            ...contactFields,
            // COMPANY
            ...companyOperations,
            ...companyFields,
            // DEAL
            ...dealOperations,
            ...dealFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            if (resource === 'contact' || resource === 'company') {
                const idGetter = resource === 'contact' ? 'contactId' : 'companyId';
                if (operation === 'get') {
                    const contactId = this.getNodeParameter(idGetter, i);
                    const endpoint = `api/contacts/${contactId}`;
                    responseData = await agileCrmApiRequest.call(this, 'GET', endpoint, {});
                }
                else if (operation === 'delete') {
                    const contactId = this.getNodeParameter(idGetter, i);
                    const endpoint = `api/contacts/${contactId}`;
                    responseData = await agileCrmApiRequest.call(this, 'DELETE', endpoint, {});
                }
                else if (operation === 'getAll') {
                    const simple = this.getNodeParameter('simple', 0);
                    const returnAll = this.getNodeParameter('returnAll', 0);
                    const filterType = this.getNodeParameter('filterType', i);
                    const sort = this.getNodeParameter('options.sort.sort', i, {});
                    const body = {};
                    const filterJson = {};
                    let contactType = '';
                    if (resource === 'contact') {
                        contactType = 'PERSON';
                    }
                    else {
                        contactType = 'COMPANY';
                    }
                    filterJson.contact_type = contactType;
                    if (filterType === 'manual') {
                        const conditions = this.getNodeParameter('filters.conditions', i, []);
                        const matchType = this.getNodeParameter('matchType', i);
                        let rules;
                        if (conditions.length !== 0) {
                            rules = getFilterRules(conditions, matchType);
                            Object.assign(filterJson, rules);
                        }
                        else {
                            throw new NodeOperationError(this.getNode(), 'At least one condition must be added.', { itemIndex: i });
                        }
                    }
                    else if (filterType === 'json') {
                        const filterJsonRules = this.getNodeParameter('filterJson', i);
                        if (validateJSON(filterJsonRules) !== undefined) {
                            Object.assign(filterJson, jsonParse(filterJsonRules));
                        }
                        else {
                            throw new NodeOperationError(this.getNode(), 'Filter (JSON) must be a valid json', {
                                itemIndex: i,
                            });
                        }
                    }
                    body.filterJson = JSON.stringify(filterJson);
                    if (sort) {
                        if (sort.direction === 'ASC') {
                            body.global_sort_key = sort.field;
                        }
                        else if (sort.direction === 'DESC') {
                            body.global_sort_key = `-${sort.field}`;
                        }
                    }
                    if (returnAll) {
                        body.page_size = 100;
                        responseData = await agileCrmApiRequestAllItems.call(this, 'POST', 'api/filters/filter/dynamic-filter', body, undefined, undefined, true);
                    }
                    else {
                        body.page_size = this.getNodeParameter('limit', 0);
                        responseData = await agileCrmApiRequest.call(this, 'POST', 'api/filters/filter/dynamic-filter', body, undefined, undefined, true);
                    }
                    if (simple) {
                        responseData = simplifyResponse(responseData);
                    }
                }
                else if (operation === 'create') {
                    const jsonParameters = this.getNodeParameter('jsonParameters', i);
                    const body = {};
                    const properties = [];
                    if (jsonParameters) {
                        const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                        if (additionalFieldsJson !== '') {
                            if (validateJSON(additionalFieldsJson) !== undefined) {
                                Object.assign(body, jsonParse(additionalFieldsJson));
                            }
                            else {
                                throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON', { itemIndex: i });
                            }
                        }
                    }
                    else {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        // if company, add 'company' as type. default is person
                        if (resource === 'company') {
                            body.type = 'COMPANY';
                        }
                        if (additionalFields.starValue) {
                            body.star_value = additionalFields.starValue;
                        }
                        if (additionalFields.tags) {
                            body.tags = additionalFields.tags;
                        }
                        // Contact specific properties
                        if (resource === 'contact') {
                            if (additionalFields.firstName) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'first_name',
                                    value: additionalFields.firstName,
                                });
                            }
                            if (additionalFields.lastName) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'last_name',
                                    value: additionalFields.lastName,
                                });
                            }
                            if (additionalFields.company) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'company',
                                    value: additionalFields.company,
                                });
                            }
                            if (additionalFields.title) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'title',
                                    value: additionalFields.title,
                                });
                            }
                            if (additionalFields.emailOptions) {
                                //@ts-ignore
                                additionalFields.emailOptions.emailProperties.map((property) => {
                                    properties.push({
                                        type: 'SYSTEM',
                                        subtype: property.subtype,
                                        name: 'email',
                                        value: property.email,
                                    });
                                });
                            }
                            if (additionalFields.addressOptions) {
                                //@ts-ignore
                                additionalFields.addressOptions.addressProperties.map((property) => {
                                    properties.push({
                                        type: 'SYSTEM',
                                        subtype: property.subtype,
                                        name: 'address',
                                        value: property.address,
                                    });
                                });
                            }
                            if (additionalFields.phoneOptions) {
                                //@ts-ignore
                                additionalFields.phoneOptions.phoneProperties.map((property) => {
                                    properties.push({
                                        type: 'SYSTEM',
                                        subtype: property.subtype,
                                        name: 'phone',
                                        value: property.number,
                                    });
                                });
                            }
                        }
                        else if (resource === 'company') {
                            if (additionalFields.email) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'email',
                                    value: additionalFields.email,
                                });
                            }
                            if (additionalFields.addressOptions) {
                                //@ts-ignore
                                additionalFields.addressOptions.addressProperties.map((property) => {
                                    properties.push({
                                        type: 'SYSTEM',
                                        subtype: property.subtype,
                                        name: 'address',
                                        value: property.address,
                                    });
                                });
                            }
                            if (additionalFields.phone) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'phone',
                                    value: additionalFields.phone,
                                });
                            }
                            if (additionalFields.name) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'name',
                                    value: additionalFields.name,
                                });
                            }
                        }
                        if (additionalFields.websiteOptions) {
                            //@ts-ignore
                            additionalFields.websiteOptions.websiteProperties.map((property) => {
                                properties.push({
                                    type: 'SYSTEM',
                                    subtype: property.subtype,
                                    name: 'website',
                                    value: property.url,
                                });
                            });
                        }
                        if (additionalFields.customProperties) {
                            //@ts-ignore
                            additionalFields.customProperties.customProperty.map((property) => {
                                properties.push({
                                    type: 'CUSTOM',
                                    subtype: property.subtype,
                                    name: property.name,
                                    value: property.value,
                                });
                            });
                        }
                        body.properties = properties;
                    }
                    const endpoint = 'api/contacts';
                    responseData = await agileCrmApiRequest.call(this, 'POST', endpoint, body);
                }
                else if (operation === 'update') {
                    const contactId = this.getNodeParameter(idGetter, i);
                    const contactUpdatePayload = { id: contactId };
                    const jsonParameters = this.getNodeParameter('jsonParameters', i);
                    const body = {};
                    const properties = [];
                    if (jsonParameters) {
                        const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                        if (additionalFieldsJson !== '') {
                            if (validateJSON(additionalFieldsJson) !== undefined) {
                                Object.assign(body, jsonParse(additionalFieldsJson));
                            }
                            else {
                                throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON', { itemIndex: i });
                            }
                        }
                    }
                    else {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.starValue) {
                            body.star_value = additionalFields.starValue;
                        }
                        if (additionalFields.tags) {
                            body.tags = additionalFields.tags;
                        }
                        // Contact specific properties
                        if (resource === 'contact') {
                            if (additionalFields.leadScore) {
                                body.lead_score = additionalFields.leadScore;
                            }
                            if (additionalFields.firstName) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'first_name',
                                    value: additionalFields.firstName,
                                });
                            }
                            if (additionalFields.lastName) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'last_name',
                                    value: additionalFields.lastName,
                                });
                            }
                            if (additionalFields.company) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'company',
                                    value: additionalFields.company,
                                });
                            }
                            if (additionalFields.title) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'title',
                                    value: additionalFields.title,
                                });
                            }
                            if (additionalFields.emailOptions) {
                                //@ts-ignore
                                additionalFields.emailOptions.emailProperties.map((property) => {
                                    properties.push({
                                        type: 'SYSTEM',
                                        subtype: property.subtype,
                                        name: 'email',
                                        value: property.email,
                                    });
                                });
                            }
                            if (additionalFields.addressOptions) {
                                //@ts-ignore
                                additionalFields.addressOptions.addressProperties.map((property) => {
                                    properties.push({
                                        type: 'SYSTEM',
                                        subtype: property.subtype,
                                        name: 'address',
                                        value: property.address,
                                    });
                                });
                            }
                            if (additionalFields.phoneOptions) {
                                //@ts-ignore
                                additionalFields.phoneOptions.phoneProperties.map((property) => {
                                    properties.push({
                                        type: 'SYSTEM',
                                        subtype: property.subtype,
                                        name: 'phone',
                                        value: property.number,
                                    });
                                });
                            }
                        }
                        else if (resource === 'company') {
                            if (additionalFields.email) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'email',
                                    value: additionalFields.email,
                                });
                            }
                            if (additionalFields.addressOptions) {
                                //@ts-ignore
                                additionalFields.addressOptions.addressProperties.map((property) => {
                                    properties.push({
                                        type: 'SYSTEM',
                                        subtype: property.subtype,
                                        name: 'address',
                                        value: property.address,
                                    });
                                });
                            }
                            if (additionalFields.phone) {
                                properties.push({
                                    type: 'SYSTEM',
                                    name: 'phone',
                                    value: additionalFields.phone,
                                });
                            }
                        }
                        if (additionalFields.websiteOptions) {
                            //@ts-ignore
                            additionalFields.websiteOptions.websiteProperties.map((property) => {
                                properties.push({
                                    type: 'SYSTEM',
                                    subtype: property.subtype,
                                    name: 'website',
                                    value: property.url,
                                });
                            });
                        }
                        if (additionalFields.name) {
                            properties.push({
                                type: 'SYSTEM',
                                name: 'name',
                                value: additionalFields.name,
                            });
                        }
                        if (additionalFields.customProperties) {
                            //@ts-ignore
                            additionalFields.customProperties.customProperty.map((property) => {
                                properties.push({
                                    type: 'CUSTOM',
                                    subtype: property.subtype,
                                    name: property.name,
                                    value: property.value,
                                });
                            });
                        }
                        body.properties = properties;
                    }
                    Object.assign(contactUpdatePayload, body);
                    responseData = await agileCrmApiRequestUpdate.call(this, 'PUT', '', contactUpdatePayload);
                }
            }
            else if (resource === 'deal') {
                if (operation === 'get') {
                    const dealId = this.getNodeParameter('dealId', i);
                    const endpoint = `api/opportunity/${dealId}`;
                    responseData = await agileCrmApiRequest.call(this, 'GET', endpoint, {});
                }
                else if (operation === 'delete') {
                    const contactId = this.getNodeParameter('dealId', i);
                    const endpoint = `api/opportunity/${contactId}`;
                    responseData = await agileCrmApiRequest.call(this, 'DELETE', endpoint, {});
                }
                else if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', 0);
                    const endpoint = 'api/opportunity';
                    if (returnAll) {
                        const limit = 100;
                        responseData = await agileCrmApiRequestAllItems.call(this, 'GET', endpoint, undefined, {
                            page_size: limit,
                        });
                    }
                    else {
                        const limit = this.getNodeParameter('limit', 0);
                        responseData = await agileCrmApiRequest.call(this, 'GET', endpoint, undefined, {
                            page_size: limit,
                        });
                    }
                }
                else if (operation === 'create') {
                    const jsonParameters = this.getNodeParameter('jsonParameters', i);
                    const body = {};
                    if (jsonParameters) {
                        const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                        if (additionalFieldsJson !== '') {
                            if (validateJSON(additionalFieldsJson) !== undefined) {
                                Object.assign(body, jsonParse(additionalFieldsJson));
                            }
                            else {
                                throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON', { itemIndex: i });
                            }
                        }
                    }
                    else {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        body.close_date = new Date(this.getNodeParameter('closeDate', i)).getTime();
                        body.expected_value = this.getNodeParameter('expectedValue', i);
                        body.milestone = this.getNodeParameter('milestone', i);
                        body.probability = this.getNodeParameter('probability', i);
                        body.name = this.getNodeParameter('name', i);
                        if (additionalFields.contactIds) {
                            body.contactIds = additionalFields.contactIds;
                        }
                        if (additionalFields.customData) {
                            // @ts-ignore
                            body.customData = additionalFields.customData.customProperty;
                        }
                    }
                    const endpoint = 'api/opportunity';
                    responseData = await agileCrmApiRequest.call(this, 'POST', endpoint, body);
                }
                else if (operation === 'update') {
                    const jsonParameters = this.getNodeParameter('jsonParameters', i);
                    const body = {};
                    if (jsonParameters) {
                        const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                        if (additionalFieldsJson !== '') {
                            if (validateJSON(additionalFieldsJson) !== undefined) {
                                Object.assign(body, jsonParse(additionalFieldsJson));
                            }
                            else {
                                throw new NodeOperationError(this.getNode(), 'Additional fields must be valid JSON', { itemIndex: i });
                            }
                        }
                    }
                    else {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        body.id = this.getNodeParameter('dealId', i);
                        if (additionalFields.expectedValue) {
                            body.expected_value = additionalFields.expectedValue;
                        }
                        if (additionalFields.name) {
                            body.name = additionalFields.name;
                        }
                        if (additionalFields.probability) {
                            body.probability = additionalFields.probability;
                        }
                        if (additionalFields.contactIds) {
                            body.contactIds = additionalFields.contactIds;
                        }
                        if (additionalFields.customData) {
                            // @ts-ignore
                            body.customData = additionalFields.customData.customProperty;
                        }
                    }
                    const endpoint = 'api/opportunity/partial-update';
                    responseData = await agileCrmApiRequest.call(this, 'PUT', endpoint, body);
                }
            }
            if (Array.isArray(responseData)) {
                returnData.push.apply(returnData, responseData);
            }
            else {
                returnData.push(responseData);
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=AgileCrm.node.js.map