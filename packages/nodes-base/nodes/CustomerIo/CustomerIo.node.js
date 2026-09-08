import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { campaignFields, campaignOperations } from './CampaignDescription';
import { customerFields, customerOperations } from './CustomerDescription';
import { eventFields, eventOperations } from './EventDescription';
import { customerIoApiRequest, validateJSON } from './GenericFunctions';
import { segmentFields, segmentOperations } from './SegmentDescription';
export class CustomerIo {
    description = {
        displayName: 'Customer.io',
        name: 'customerIo',
        icon: { light: 'file:customerio.svg', dark: 'file:customerio.dark.svg' },
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Customer.io API',
        defaults: {
            name: 'Customer.io',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'customerIoApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Customer',
                        value: 'customer',
                    },
                    {
                        name: 'Event',
                        value: 'event',
                    },
                    {
                        name: 'Campaign',
                        value: 'campaign',
                    },
                    {
                        name: 'Segment',
                        value: 'segment',
                    },
                ],
                default: 'customer',
            },
            // CAMPAIGN
            ...campaignOperations,
            ...campaignFields,
            // CUSTOMER
            ...customerOperations,
            ...customerFields,
            // EVENT
            ...eventOperations,
            ...eventFields,
            // SEGMENT
            ...segmentOperations,
            ...segmentFields,
        ],
    };
    async execute() {
        const returnData = [];
        const items = this.getInputData();
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        const body = {};
        let responseData;
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'campaign') {
                    if (operation === 'get') {
                        const campaignId = this.getNodeParameter('campaignId', i);
                        const endpoint = `/campaigns/${campaignId}`;
                        responseData = await customerIoApiRequest.call(this, 'GET', endpoint, body, 'app');
                        responseData = responseData.campaign;
                    }
                    if (operation === 'getAll') {
                        const endpoint = '/campaigns';
                        responseData = await customerIoApiRequest.call(this, 'GET', endpoint, body, 'app');
                        responseData = responseData.campaigns;
                    }
                    if (operation === 'getMetrics') {
                        const campaignId = this.getNodeParameter('campaignId', i);
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        if (jsonParameters) {
                            const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                            if (additionalFieldsJson !== '') {
                                if (validateJSON(additionalFieldsJson) !== undefined) {
                                    Object.assign(body, JSON.parse(additionalFieldsJson));
                                }
                                else {
                                    throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON', { itemIndex: i });
                                }
                            }
                        }
                        else {
                            const additionalFields = this.getNodeParameter('additionalFields', i);
                            const period = this.getNodeParameter('period', i);
                            let endpoint = `/campaigns/${campaignId}/metrics`;
                            if (period !== 'days') {
                                endpoint = `${endpoint}?period=${period}`;
                            }
                            if (additionalFields.steps) {
                                body.steps = additionalFields.steps;
                            }
                            if (additionalFields.type) {
                                if (additionalFields.type === 'urbanAirship') {
                                    additionalFields.type = 'urban_airship';
                                }
                                else {
                                    body.type = additionalFields.type;
                                }
                            }
                            responseData = await customerIoApiRequest.call(this, 'GET', endpoint, body, 'app');
                            responseData = responseData.metric;
                        }
                    }
                }
                if (resource === 'customer') {
                    if (operation === 'upsert') {
                        const id = this.getNodeParameter('id', i);
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        if (jsonParameters) {
                            const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                            if (additionalFieldsJson !== '') {
                                if (validateJSON(additionalFieldsJson) !== undefined) {
                                    Object.assign(body, JSON.parse(additionalFieldsJson));
                                }
                                else {
                                    throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON', { itemIndex: i });
                                }
                            }
                        }
                        else {
                            const additionalFields = this.getNodeParameter('additionalFields', i);
                            if (additionalFields.customProperties) {
                                const data = {};
                                //@ts-ignore
                                additionalFields.customProperties.customProperty.map((property) => {
                                    data[property.key] = property.value;
                                });
                                body.data = data;
                            }
                            if (additionalFields.email) {
                                body.email = additionalFields.email;
                            }
                            if (additionalFields.createdAt) {
                                body.created_at = new Date(additionalFields.createdAt).getTime() / 1000;
                            }
                        }
                        const endpoint = `/customers/${id}`;
                        responseData = await customerIoApiRequest.call(this, 'PUT', endpoint, body, 'tracking');
                        responseData = Object.assign({ id }, body);
                    }
                    if (operation === 'delete') {
                        const id = this.getNodeParameter('id', i);
                        body.id = id;
                        const endpoint = `/customers/${id}`;
                        await customerIoApiRequest.call(this, 'DELETE', endpoint, body, 'tracking');
                        responseData = {
                            success: true,
                        };
                    }
                }
                if (resource === 'event') {
                    if (operation === 'track') {
                        const customerId = this.getNodeParameter('customerId', i);
                        const eventName = this.getNodeParameter('eventName', i);
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        body.name = eventName;
                        if (jsonParameters) {
                            const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                            if (additionalFieldsJson !== '') {
                                if (validateJSON(additionalFieldsJson) !== undefined) {
                                    Object.assign(body, JSON.parse(additionalFieldsJson));
                                }
                                else {
                                    throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON', { itemIndex: i });
                                }
                            }
                        }
                        else {
                            const additionalFields = this.getNodeParameter('additionalFields', i);
                            const data = {};
                            if (additionalFields.customAttributes) {
                                //@ts-ignore
                                additionalFields.customAttributes.customAttribute.map((property) => {
                                    data[property.key] = property.value;
                                });
                            }
                            if (additionalFields.type) {
                                data.type = additionalFields.type;
                            }
                            body.data = data;
                        }
                        const endpoint = `/customers/${customerId}/events`;
                        await customerIoApiRequest.call(this, 'POST', endpoint, body, 'tracking');
                        responseData = {
                            success: true,
                        };
                    }
                    if (operation === 'trackAnonymous') {
                        const eventName = this.getNodeParameter('eventName', i);
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        body.name = eventName;
                        if (jsonParameters) {
                            const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                            if (additionalFieldsJson !== '') {
                                if (validateJSON(additionalFieldsJson) !== undefined) {
                                    Object.assign(body, JSON.parse(additionalFieldsJson));
                                }
                                else {
                                    throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON', { itemIndex: i });
                                }
                            }
                        }
                        else {
                            const additionalFields = this.getNodeParameter('additionalFields', i);
                            const data = {};
                            if (additionalFields.customAttributes) {
                                //@ts-ignore
                                additionalFields.customAttributes.customAttribute.map((property) => {
                                    data[property.key] = property.value;
                                });
                            }
                            body.data = data;
                        }
                        const endpoint = '/events';
                        await customerIoApiRequest.call(this, 'POST', endpoint, body, 'tracking');
                        responseData = {
                            success: true,
                        };
                    }
                }
                if (resource === 'segment') {
                    const segmentId = this.getNodeParameter('segmentId', i);
                    const customerIds = this.getNodeParameter('customerIds', i);
                    body.id = segmentId;
                    body.ids = customerIds.split(',');
                    let endpoint = '';
                    if (operation === 'add') {
                        endpoint = `/segments/${segmentId}/add_customers`;
                    }
                    else {
                        endpoint = `/segments/${segmentId}/remove_customers`;
                    }
                    responseData = await customerIoApiRequest.call(this, 'POST', endpoint, body, 'tracking');
                    responseData = {
                        success: true,
                    };
                }
                if (Array.isArray(responseData)) {
                    returnData.push.apply(returnData, responseData);
                }
                else {
                    returnData.push(responseData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message });
                    continue;
                }
                throw error;
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=CustomerIo.node.js.map