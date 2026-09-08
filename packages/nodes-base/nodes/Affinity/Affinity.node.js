import { NodeConnectionTypes } from 'n8n-workflow';
import { affinityApiRequest, affinityApiRequestAllItems } from './GenericFunctions';
import { listFields, listOperations } from './ListDescription';
import { listEntryFields, listEntryOperations } from './ListEntryDescription';
import { organizationFields, organizationOperations } from './OrganizationDescription';
import { personFields, personOperations } from './PersonDescription';
export class Affinity {
    description = {
        displayName: 'Affinity',
        name: 'affinity',
        icon: { light: 'file:affinity.svg', dark: 'file:affinity.dark.svg' },
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Affinity API',
        defaults: {
            name: 'Affinity',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'affinityApi',
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
                        name: 'List',
                        value: 'list',
                    },
                    {
                        name: 'List Entry',
                        value: 'listEntry',
                    },
                    {
                        name: 'Organization',
                        value: 'organization',
                    },
                    {
                        name: 'Person',
                        value: 'person',
                    },
                ],
                default: 'organization',
            },
            ...listOperations,
            ...listFields,
            ...listEntryOperations,
            ...listEntryFields,
            ...organizationOperations,
            ...organizationFields,
            ...personOperations,
            ...personFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the available organizations to display them to user so that they can
            // select them easily
            async getOrganizations() {
                const returnData = [];
                const organizations = await affinityApiRequestAllItems.call(this, 'organizations', 'GET', '/organizations', {});
                for (const organization of organizations) {
                    const organizationName = organization.name;
                    const organizationId = organization.id;
                    returnData.push({
                        name: organizationName,
                        value: organizationId,
                    });
                }
                return returnData;
            },
            // Get all the available persons to display them to user so that they can
            // select them easily
            async getPersons() {
                const returnData = [];
                const persons = await affinityApiRequestAllItems.call(this, 'persons', 'GET', '/persons', {});
                for (const person of persons) {
                    let personName = `${person.first_name} ${person.last_name}`;
                    if (person.primary_email !== null) {
                        personName += ` (${person.primary_email})`;
                    }
                    const personId = person.id;
                    returnData.push({
                        name: personName,
                        value: personId,
                    });
                }
                return returnData;
            },
            // Get all the available lists to display them to user so that they can
            // select them easily
            async getLists() {
                const returnData = [];
                const lists = await affinityApiRequest.call(this, 'GET', '/lists');
                for (const list of lists) {
                    returnData.push({
                        name: list.name,
                        value: list.id,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const qs = {};
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'list') {
                    //https://api-docs.affinity.co/#get-a-specific-list
                    if (operation === 'get') {
                        const listId = this.getNodeParameter('listId', i);
                        responseData = await affinityApiRequest.call(this, 'GET', `/lists/${listId}`, {}, qs);
                    }
                    //https://api-docs.affinity.co/#get-all-lists
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        responseData = await affinityApiRequest.call(this, 'GET', '/lists', {}, qs);
                        if (!returnAll) {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = responseData.splice(0, limit);
                        }
                    }
                }
                if (resource === 'listEntry') {
                    //https://api-docs.affinity.co/#create-a-new-list-entry
                    if (operation === 'create') {
                        const listId = this.getNodeParameter('listId', i);
                        const entityId = this.getNodeParameter('entityId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            entity_id: parseInt(entityId, 10),
                        };
                        Object.assign(body, additionalFields);
                        responseData = await affinityApiRequest.call(this, 'POST', `/lists/${listId}/list-entries`, body);
                    }
                    //https://api-docs.affinity.co/#get-a-specific-list-entry
                    if (operation === 'get') {
                        const listId = this.getNodeParameter('listId', i);
                        const listEntryId = this.getNodeParameter('listEntryId', i);
                        responseData = await affinityApiRequest.call(this, 'GET', `/lists/${listId}/list-entries/${listEntryId}`, {}, qs);
                    }
                    //https://api-docs.affinity.co/#get-all-list-entries
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const listId = this.getNodeParameter('listId', i);
                        if (returnAll) {
                            responseData = await affinityApiRequestAllItems.call(this, 'list_entries', 'GET', `/lists/${listId}/list-entries`, {}, qs);
                        }
                        else {
                            qs.page_size = this.getNodeParameter('limit', i);
                            responseData = await affinityApiRequest.call(this, 'GET', `/lists/${listId}/list-entries`, {}, qs);
                            responseData = responseData.list_entries;
                        }
                    }
                    //https://api-docs.affinity.co/#delete-a-specific-list-entry
                    if (operation === 'delete') {
                        const listId = this.getNodeParameter('listId', i);
                        const listEntryId = this.getNodeParameter('listEntryId', i);
                        responseData = await affinityApiRequest.call(this, 'DELETE', `/lists/${listId}/list-entries/${listEntryId}`, {}, qs);
                    }
                }
                if (resource === 'person') {
                    //https://api-docs.affinity.co/#create-a-new-person
                    if (operation === 'create') {
                        const firstName = this.getNodeParameter('firstName', i);
                        const lastName = this.getNodeParameter('lastName', i);
                        const emails = this.getNodeParameter('emails', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            first_name: firstName,
                            last_name: lastName,
                            emails,
                        };
                        if (additionalFields.organizations) {
                            body.organization_ids = additionalFields.organizations;
                        }
                        responseData = await affinityApiRequest.call(this, 'POST', '/persons', body);
                    }
                    //https://api-docs.affinity.co/#update-a-person
                    if (operation === 'update') {
                        const personId = this.getNodeParameter('personId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const emails = this.getNodeParameter('emails', i);
                        const body = {
                            emails,
                        };
                        if (updateFields.firstName) {
                            body.first_name = updateFields.firstName;
                        }
                        if (updateFields.lastName) {
                            body.last_name = updateFields.lastName;
                        }
                        if (updateFields.organizations) {
                            body.organization_ids = updateFields.organizations;
                        }
                        responseData = await affinityApiRequest.call(this, 'PUT', `/persons/${personId}`, body);
                    }
                    //https://api-docs.affinity.co/#get-a-specific-person
                    if (operation === 'get') {
                        const personId = this.getNodeParameter('personId', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.withInteractionDates) {
                            qs.with_interaction_dates = options.withInteractionDates;
                        }
                        responseData = await affinityApiRequest.call(this, 'GET', `/persons/${personId}`, {}, qs);
                    }
                    //https://api-docs.affinity.co/#search-for-persons
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.term) {
                            qs.term = options.term;
                        }
                        if (options.withInteractionDates) {
                            qs.with_interaction_dates = options.withInteractionDates;
                        }
                        if (returnAll) {
                            responseData = await affinityApiRequestAllItems.call(this, 'persons', 'GET', '/persons', {}, qs);
                        }
                        else {
                            qs.page_size = this.getNodeParameter('limit', i);
                            responseData = await affinityApiRequest.call(this, 'GET', '/persons', {}, qs);
                            responseData = responseData.persons;
                        }
                    }
                    //https://api-docs.affinity.co/#delete-a-person
                    if (operation === 'delete') {
                        const personId = this.getNodeParameter('personId', i);
                        responseData = await affinityApiRequest.call(this, 'DELETE', `/persons/${personId}`, {}, qs);
                    }
                }
                if (resource === 'organization') {
                    //https://api-docs.affinity.co/#create-a-new-organization
                    if (operation === 'create') {
                        const name = this.getNodeParameter('name', i);
                        const domain = this.getNodeParameter('domain', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            name,
                            domain,
                        };
                        if (additionalFields.persons) {
                            body.person_ids = additionalFields.persons;
                        }
                        responseData = await affinityApiRequest.call(this, 'POST', '/organizations', body);
                    }
                    //https://api-docs.affinity.co/#update-an-organization
                    if (operation === 'update') {
                        const organizationId = this.getNodeParameter('organizationId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.name) {
                            body.name = updateFields.name;
                        }
                        if (updateFields.domain) {
                            body.domain = updateFields.domain;
                        }
                        if (updateFields.persons) {
                            body.person_ids = updateFields.persons;
                        }
                        responseData = await affinityApiRequest.call(this, 'PUT', `/organizations/${organizationId}`, body);
                    }
                    //https://api-docs.affinity.co/#get-a-specific-organization
                    if (operation === 'get') {
                        const organizationId = this.getNodeParameter('organizationId', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.withInteractionDates) {
                            qs.with_interaction_dates = options.withInteractionDates;
                        }
                        responseData = await affinityApiRequest.call(this, 'GET', `/organizations/${organizationId}`, {}, qs);
                    }
                    //https://api-docs.affinity.co/#search-for-organizations
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.term) {
                            qs.term = options.term;
                        }
                        if (options.withInteractionDates) {
                            qs.with_interaction_dates = options.withInteractionDates;
                        }
                        if (returnAll) {
                            responseData = await affinityApiRequestAllItems.call(this, 'organizations', 'GET', '/organizations', {}, qs);
                        }
                        else {
                            qs.page_size = this.getNodeParameter('limit', i);
                            responseData = await affinityApiRequest.call(this, 'GET', '/organizations', {}, qs);
                            responseData = responseData.organizations;
                        }
                    }
                    //https://api-docs.affinity.co/#delete-an-organization
                    if (operation === 'delete') {
                        const organizationId = this.getNodeParameter('organizationId', i);
                        responseData = await affinityApiRequest.call(this, 'DELETE', `/organizations/${organizationId}`, {}, qs);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Affinity.node.js.map