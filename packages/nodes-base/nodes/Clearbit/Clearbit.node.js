import { NodeConnectionTypes } from 'n8n-workflow';
import { companyFields, companyOperations } from './CompanyDescription';
import { clearbitApiRequest } from './GenericFunctions';
import { personFields, personOperations } from './PersonDescription';
export class Clearbit {
    description = {
        displayName: 'Clearbit',
        name: 'clearbit',
        icon: 'file:clearbit.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
        description: 'Consume Clearbit API',
        defaults: {
            name: 'Clearbit',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'clearbitApi',
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
                        name: 'Company',
                        value: 'company',
                        description: 'The Company API allows you to look up a company by their domain',
                    },
                    {
                        name: 'Person',
                        value: 'person',
                        description: 'The Person API lets you retrieve social information associated with an email address, such as a person’s name, location and Twitter handle',
                    },
                ],
                default: 'company',
            },
            ...companyOperations,
            ...companyFields,
            ...personOperations,
            ...personFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'person') {
                    if (operation === 'enrich') {
                        const email = this.getNodeParameter('email', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        qs.email = email;
                        if (additionalFields.givenName) {
                            qs.given_name = additionalFields.givenName;
                        }
                        if (additionalFields.familyName) {
                            qs.family_name = additionalFields.familyName;
                        }
                        if (additionalFields.ipAddress) {
                            qs.ip_address = additionalFields.ipAddress;
                        }
                        if (additionalFields.location) {
                            qs.location = additionalFields.location;
                        }
                        if (additionalFields.company) {
                            qs.company = additionalFields.company;
                        }
                        if (additionalFields.companyDomain) {
                            qs.company_domain = additionalFields.companyDomain;
                        }
                        if (additionalFields.linkedIn) {
                            qs.linkedin = additionalFields.linkedIn;
                        }
                        if (additionalFields.twitter) {
                            qs.twitter = additionalFields.twitter;
                        }
                        if (additionalFields.facebook) {
                            qs.facebook = additionalFields.facebook;
                        }
                        responseData = await clearbitApiRequest.call(this, 'GET', `${resource}-stream`, '/v2/people/find', {}, qs);
                    }
                }
                if (resource === 'company') {
                    if (operation === 'enrich') {
                        const domain = this.getNodeParameter('domain', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        qs.domain = domain;
                        if (additionalFields.companyName) {
                            qs.company_name = additionalFields.companyName;
                        }
                        if (additionalFields.linkedin) {
                            qs.linkedin = additionalFields.linkedin;
                        }
                        if (additionalFields.twitter) {
                            qs.twitter = additionalFields.twitter;
                        }
                        if (additionalFields.facebook) {
                            qs.facebook = additionalFields.facebook;
                        }
                        responseData = await clearbitApiRequest.call(this, 'GET', `${resource}-stream`, '/v2/companies/find', {}, qs);
                    }
                    if (operation === 'autocomplete') {
                        const name = this.getNodeParameter('name', i);
                        qs.query = name;
                        responseData = await clearbitApiRequest.call(this, 'GET', 'autocomplete', '/v1/companies/suggest', {}, qs);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message, json: {} });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Clearbit.node.js.map