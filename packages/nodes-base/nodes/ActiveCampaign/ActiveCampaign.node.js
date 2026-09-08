import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { accountContactFields, accountContactOperations } from './AccountContactDescription';
import { accountFields, accountOperations } from './AccountDescription';
import { connectionFields, connectionOperations } from './ConnectionDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { contactListFields, contactListOperations } from './ContactListDescription';
import { contactTagFields, contactTagOperations } from './ContactTagDescription';
import { dealFields, dealOperations } from './DealDescription';
import { ecomCustomerFields, ecomCustomerOperations } from './EcomCustomerDescription';
import { ecomOrderFields, ecomOrderOperations } from './EcomOrderDescription';
import { ecomOrderProductsFields, ecomOrderProductsOperations, } from './EcomOrderProductsDescription';
import { activeCampaignApiRequest, activeCampaignApiRequestAllItems } from './GenericFunctions';
import { listFields, listOperations } from './ListDescription';
import { tagFields, tagOperations } from './TagDescription';
/**
 * Add the additional fields to the body
 *
 * @param {IDataObject} body The body object to add fields to
 * @param {IDataObject} additionalFields The fields to add
 */
function addAdditionalFields(body, additionalFields) {
    for (const key of Object.keys(additionalFields)) {
        if (key === 'customProperties' &&
            additionalFields.customProperties.property !== undefined) {
            for (const customProperty of additionalFields.customProperties
                .property) {
                body[customProperty.name] = customProperty.value;
            }
        }
        else if (key === 'fieldValues' &&
            additionalFields.fieldValues.property !== undefined) {
            body.fieldValues = additionalFields.fieldValues.property;
        }
        else if (key === 'fields' &&
            additionalFields.fields.property !== undefined) {
            body.fields = additionalFields.fields.property;
        }
        else {
            body[key] = additionalFields[key];
        }
    }
}
export class ActiveCampaign {
    description = {
        displayName: 'ActiveCampaign',
        name: 'activeCampaign',
        icon: { light: 'file:activeCampaign.svg', dark: 'file:activeCampaign.dark.svg' },
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Create and edit data in ActiveCampaign',
        defaults: {
            name: 'ActiveCampaign',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'activeCampaignApi',
                required: true,
            },
        ],
        properties: [
            // ----------------------------------
            //         resources
            // ----------------------------------
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Account',
                        value: 'account',
                    },
                    {
                        name: 'Account Contact',
                        value: 'accountContact',
                    },
                    {
                        name: 'Connection',
                        value: 'connection',
                    },
                    {
                        name: 'Contact',
                        value: 'contact',
                    },
                    {
                        name: 'Contact List',
                        value: 'contactList',
                    },
                    {
                        name: 'Contact Tag',
                        value: 'contactTag',
                    },
                    {
                        name: 'Deal',
                        value: 'deal',
                    },
                    {
                        name: 'E-Commerce Customer',
                        value: 'ecommerceCustomer',
                    },
                    {
                        name: 'E-Commerce Order',
                        value: 'ecommerceOrder',
                    },
                    {
                        name: 'E-Commerce Order Product',
                        value: 'ecommerceOrderProducts',
                    },
                    {
                        name: 'List',
                        value: 'list',
                    },
                    {
                        name: 'Tag',
                        value: 'tag',
                    },
                ],
                default: 'contact',
            },
            // ----------------------------------
            //         operations
            // ----------------------------------
            ...accountOperations,
            ...contactOperations,
            ...accountContactOperations,
            ...contactListOperations,
            ...contactTagOperations,
            ...listOperations,
            ...tagOperations,
            ...dealOperations,
            ...connectionOperations,
            ...ecomOrderOperations,
            ...ecomCustomerOperations,
            ...ecomOrderProductsOperations,
            // ----------------------------------
            //         fields
            // ----------------------------------
            // ----------------------------------
            //         tag
            // ----------------------------------
            ...tagFields,
            // ----------------------------------
            //         list
            // ----------------------------------
            ...listFields,
            // ----------------------------------
            // ----------------------------------
            //         tag
            // ----------------------------------
            ...contactTagFields,
            // ----------------------------------
            //         Contact List
            // ----------------------------------
            ...contactListFields,
            // ----------------------------------
            //         account
            // ----------------------------------
            ...accountFields,
            // ----------------------------------
            //         account
            // ----------------------------------
            ...accountContactFields,
            // ----------------------------------
            //         contact
            // ----------------------------------
            ...contactFields,
            // ----------------------------------
            //         deal
            // ----------------------------------
            ...dealFields,
            // ----------------------------------
            //         connection
            // ----------------------------------
            ...connectionFields,
            // ----------------------------------
            //         ecommerceOrder
            // ----------------------------------
            ...ecomOrderFields,
            // ----------------------------------
            //         ecommerceCustomer
            // ----------------------------------
            ...ecomCustomerFields,
            // ----------------------------------
            //         ecommerceOrderProducts
            // ----------------------------------
            ...ecomOrderProductsFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the available custom fields to display them to user so that they can
            // select them easily
            async getContactCustomFields() {
                const returnData = [];
                const { fields } = await activeCampaignApiRequest.call(this, 'GET', '/api/3/fields', {}, { limit: 100 });
                for (const field of fields) {
                    const fieldName = field.title;
                    const fieldId = field.id;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                return returnData;
            },
            // Get all the available custom fields to display them to user so that they can
            // select them easily
            async getAccountCustomFields() {
                const returnData = [];
                const { accountCustomFieldMeta: fields } = await activeCampaignApiRequest.call(this, 'GET', '/api/3/accountCustomFieldMeta', {}, { limit: 100 });
                for (const field of fields) {
                    const fieldName = field.fieldLabel;
                    const fieldId = field.id;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                return returnData;
            },
            // Get all the available tags to display them to user so that they can
            // select them easily
            async getTags() {
                const returnData = [];
                const tags = await activeCampaignApiRequestAllItems.call(this, 'GET', '/api/3/tags', {}, { limit: 100 }, 'tags');
                for (const tag of tags) {
                    returnData.push({
                        name: tag.tag,
                        value: tag.id,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        let resource;
        let operation;
        // For Post
        let body;
        // For Query string
        let qs;
        let requestMethod;
        let endpoint;
        let returnAll = false;
        let dataKey;
        for (let i = 0; i < items.length; i++) {
            try {
                dataKey = undefined;
                resource = this.getNodeParameter('resource', 0);
                operation = this.getNodeParameter('operation', 0);
                requestMethod = 'GET';
                endpoint = '';
                body = {};
                qs = {};
                if (resource === 'contact') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         contact:create
                        // ----------------------------------
                        requestMethod = 'POST';
                        const updateIfExists = this.getNodeParameter('updateIfExists', i);
                        if (updateIfExists) {
                            endpoint = '/api/3/contact/sync';
                        }
                        else {
                            endpoint = '/api/3/contacts';
                        }
                        dataKey = 'contact';
                        body.contact = {
                            email: this.getNodeParameter('email', i),
                        };
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        addAdditionalFields(body.contact, additionalFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         contact:delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const contactId = this.getNodeParameter('contactId', i);
                        endpoint = `/api/3/contacts/${contactId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         contact:get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const contactId = this.getNodeParameter('contactId', i);
                        endpoint = `/api/3/contacts/${contactId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         contacts:getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        returnAll = this.getNodeParameter('returnAll', i);
                        const simple = this.getNodeParameter('simple', i, true);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        Object.assign(qs, additionalFields);
                        if (qs.orderBy) {
                            qs[qs.orderBy] = true;
                            delete qs.orderBy;
                        }
                        if (simple) {
                            dataKey = 'contacts';
                        }
                        endpoint = '/api/3/contacts';
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         contact:update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const contactId = this.getNodeParameter('contactId', i);
                        endpoint = `/api/3/contacts/${contactId}`;
                        dataKey = 'contact';
                        body.contact = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        addAdditionalFields(body.contact, updateFields);
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'account') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         account:create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/accounts';
                        dataKey = 'account';
                        body.account = {
                            name: this.getNodeParameter('name', i),
                        };
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        addAdditionalFields(body.account, additionalFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         account:delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const accountId = this.getNodeParameter('accountId', i);
                        endpoint = `/api/3/accounts/${accountId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         account:get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const accountId = this.getNodeParameter('accountId', i);
                        endpoint = `/api/3/accounts/${accountId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         account:getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const simple = this.getNodeParameter('simple', i, true);
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        if (simple) {
                            dataKey = 'accounts';
                        }
                        endpoint = '/api/3/accounts';
                        const filters = this.getNodeParameter('filters', i);
                        Object.assign(qs, filters);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         account:update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const accountId = this.getNodeParameter('accountId', i);
                        endpoint = `/api/3/accounts/${accountId}`;
                        dataKey = 'account';
                        body.account = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        addAdditionalFields(body.account, updateFields);
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'accountContact') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         accountContact:create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/accountContacts';
                        dataKey = 'accountContact';
                        body.accountContact = {
                            contact: this.getNodeParameter('contact', i),
                            account: this.getNodeParameter('account', i),
                        };
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        addAdditionalFields(body.accountContact, additionalFields);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         accountContact:update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const accountContactId = this.getNodeParameter('accountContactId', i);
                        endpoint = `/api/3/accountContacts/${accountContactId}`;
                        dataKey = 'accountContact';
                        body.accountContact = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        addAdditionalFields(body.accountContact, updateFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         accountContact:delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const accountContactId = this.getNodeParameter('accountContactId', i);
                        endpoint = `/api/3/accountContacts/${accountContactId}`;
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'contactTag') {
                    if (operation === 'add') {
                        // ----------------------------------
                        //         contactTag:add
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/contactTags';
                        dataKey = 'contactTag';
                        body.contactTag = {
                            contact: this.getNodeParameter('contactId', i),
                            tag: this.getNodeParameter('tagId', i),
                        };
                    }
                    else if (operation === 'remove') {
                        // ----------------------------------
                        //         contactTag:remove
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const contactTagId = this.getNodeParameter('contactTagId', i);
                        endpoint = `/api/3/contactTags/${contactTagId}`;
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'contactList') {
                    if (operation === 'add') {
                        // ----------------------------------
                        //         contactList:add
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/contactLists';
                        dataKey = 'contactTag';
                        body.contactList = {
                            list: this.getNodeParameter('listId', i),
                            contact: this.getNodeParameter('contactId', i),
                            status: 1,
                        };
                    }
                    else if (operation === 'remove') {
                        // ----------------------------------
                        //         contactList:remove
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/contactLists';
                        body.contactList = {
                            list: this.getNodeParameter('listId', i),
                            contact: this.getNodeParameter('contactId', i),
                            status: 2,
                        };
                        dataKey = 'contacts';
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'list') {
                    if (operation === 'getAll') {
                        // ----------------------------------
                        //         list:getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        returnAll = this.getNodeParameter('returnAll', i);
                        const simple = this.getNodeParameter('simple', i, true);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        if (simple) {
                            dataKey = 'lists';
                        }
                        endpoint = '/api/3/lists';
                    }
                }
                else if (resource === 'tag') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         tag:create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/tags';
                        dataKey = 'tag';
                        body.tag = {
                            tag: this.getNodeParameter('name', i),
                            tagType: this.getNodeParameter('tagType', i),
                        };
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        addAdditionalFields(body.tag, additionalFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         tag:delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const tagId = this.getNodeParameter('tagId', i);
                        endpoint = `/api/3/tags/${tagId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         tag:get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const tagId = this.getNodeParameter('tagId', i);
                        endpoint = `/api/3/tags/${tagId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         tags:getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const simple = this.getNodeParameter('simple', i, true);
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        if (simple) {
                            dataKey = 'tags';
                        }
                        endpoint = '/api/3/tags';
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         tags:update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const tagId = this.getNodeParameter('tagId', i);
                        endpoint = `/api/3/tags/${tagId}`;
                        dataKey = 'tag';
                        body.tag = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        addAdditionalFields(body.tag, updateFields);
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'deal') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         deal:create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/deals';
                        body.deal = {
                            title: this.getNodeParameter('title', i),
                            contact: this.getNodeParameter('contact', i),
                            value: this.getNodeParameter('value', i),
                            currency: this.getNodeParameter('currency', i),
                        };
                        const group = this.getNodeParameter('group', i);
                        if (group !== '') {
                            addAdditionalFields(body.deal, { group });
                        }
                        const owner = this.getNodeParameter('owner', i);
                        if (owner !== '') {
                            addAdditionalFields(body.deal, { owner });
                        }
                        const stage = this.getNodeParameter('stage', i);
                        if (stage !== '') {
                            addAdditionalFields(body.deal, { stage });
                        }
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        addAdditionalFields(body.deal, additionalFields);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         deal:update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const dealId = this.getNodeParameter('dealId', i);
                        endpoint = `/api/3/deals/${dealId}`;
                        body.deal = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        addAdditionalFields(body.deal, updateFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         deal:delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const dealId = this.getNodeParameter('dealId', i);
                        endpoint = `/api/3/deals/${dealId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         deal:get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const dealId = this.getNodeParameter('dealId', i);
                        endpoint = `/api/3/deals/${dealId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         deals:getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const simple = this.getNodeParameter('simple', i, true);
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        if (simple) {
                            dataKey = 'deals';
                        }
                        endpoint = '/api/3/deals';
                    }
                    else if (operation === 'createNote') {
                        // ----------------------------------
                        //         deal:createNote
                        // ----------------------------------
                        requestMethod = 'POST';
                        body.note = {
                            note: this.getNodeParameter('dealNote', i),
                        };
                        const dealId = this.getNodeParameter('dealId', i);
                        endpoint = `/api/3/deals/${dealId}/notes`;
                    }
                    else if (operation === 'updateNote') {
                        // ----------------------------------
                        //         deal:updateNote
                        // ----------------------------------
                        requestMethod = 'PUT';
                        body.note = {
                            note: this.getNodeParameter('dealNote', i),
                        };
                        const dealId = this.getNodeParameter('dealId', i);
                        const dealNoteId = this.getNodeParameter('dealNoteId', i);
                        endpoint = `/api/3/deals/${dealId}/notes/${dealNoteId}`;
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'connection') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         connection:create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/connections';
                        body.connection = {
                            service: this.getNodeParameter('service', i),
                            externalid: this.getNodeParameter('externalid', i),
                            name: this.getNodeParameter('name', i),
                            logoUrl: this.getNodeParameter('logoUrl', i),
                            linkUrl: this.getNodeParameter('linkUrl', i),
                        };
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         connection:update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const connectionId = this.getNodeParameter('connectionId', i);
                        endpoint = `/api/3/connections/${connectionId}`;
                        body.connection = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        addAdditionalFields(body.connection, updateFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         connection:delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const connectionId = this.getNodeParameter('connectionId', i);
                        endpoint = `/api/3/connections/${connectionId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         connection:get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const connectionId = this.getNodeParameter('connectionId', i);
                        endpoint = `/api/3/connections/${connectionId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         connections:getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const simple = this.getNodeParameter('simple', i, true);
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        if (simple) {
                            dataKey = 'connections';
                        }
                        endpoint = '/api/3/connections';
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'ecommerceOrder') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         ecommerceOrder:create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/ecomOrders';
                        body.ecomOrder = {
                            source: this.getNodeParameter('source', i),
                            email: this.getNodeParameter('email', i),
                            totalPrice: this.getNodeParameter('totalPrice', i),
                            currency: this.getNodeParameter('currency', i).toString().toUpperCase(),
                            externalCreatedDate: this.getNodeParameter('externalCreatedDate', i),
                            connectionid: this.getNodeParameter('connectionid', i),
                            customerid: this.getNodeParameter('customerid', i),
                        };
                        const externalid = this.getNodeParameter('externalid', i);
                        if (externalid !== '') {
                            addAdditionalFields(body.ecomOrder, { externalid });
                        }
                        const externalcheckoutid = this.getNodeParameter('externalcheckoutid', i);
                        if (externalcheckoutid !== '') {
                            addAdditionalFields(body.ecomOrder, { externalcheckoutid });
                        }
                        const abandonedDate = this.getNodeParameter('abandonedDate', i);
                        if (abandonedDate !== '') {
                            addAdditionalFields(body.ecomOrder, { abandonedDate });
                        }
                        const orderProducts = this.getNodeParameter('orderProducts', i);
                        addAdditionalFields(body.ecomOrder, { orderProducts });
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        addAdditionalFields(body.ecomOrder, additionalFields);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         ecommerceOrder:update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const orderId = this.getNodeParameter('orderId', i);
                        endpoint = `/api/3/ecomOrders/${orderId}`;
                        body.ecomOrder = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        addAdditionalFields(body.ecomOrder, updateFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         ecommerceOrder:delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const orderId = this.getNodeParameter('orderId', i);
                        endpoint = `/api/3/ecomOrders/${orderId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         ecommerceOrder:get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const orderId = this.getNodeParameter('orderId', i);
                        endpoint = `/api/3/ecomOrders/${orderId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         ecommerceOrders:getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const simple = this.getNodeParameter('simple', i, true);
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        if (simple) {
                            dataKey = 'ecomOrders';
                        }
                        endpoint = '/api/3/ecomOrders';
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'ecommerceCustomer') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         ecommerceCustomer:create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = '/api/3/ecomCustomers';
                        body.ecomCustomer = {
                            connectionid: this.getNodeParameter('connectionid', i),
                            externalid: this.getNodeParameter('externalid', i),
                            email: this.getNodeParameter('email', i),
                        };
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.acceptsMarketing !== undefined) {
                            if (additionalFields.acceptsMarketing === true) {
                                additionalFields.acceptsMarketing = '1';
                            }
                            else {
                                additionalFields.acceptsMarketing = '0';
                            }
                        }
                        addAdditionalFields(body.ecomCustomer, additionalFields);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         ecommerceCustomer:update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const ecommerceCustomerId = this.getNodeParameter('ecommerceCustomerId', i);
                        endpoint = `/api/3/ecomCustomers/${ecommerceCustomerId}`;
                        body.ecomCustomer = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        if (updateFields.acceptsMarketing !== undefined) {
                            if (updateFields.acceptsMarketing === true) {
                                updateFields.acceptsMarketing = '1';
                            }
                            else {
                                updateFields.acceptsMarketing = '0';
                            }
                        }
                        addAdditionalFields(body.ecomCustomer, updateFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         ecommerceCustomer:delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const ecommerceCustomerId = this.getNodeParameter('ecommerceCustomerId', i);
                        endpoint = `/api/3/ecomCustomers/${ecommerceCustomerId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         ecommerceCustomer:get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const ecommerceCustomerId = this.getNodeParameter('ecommerceCustomerId', i);
                        endpoint = `/api/3/ecomCustomers/${ecommerceCustomerId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         ecommerceCustomers:getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const simple = this.getNodeParameter('simple', i, true);
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        if (simple) {
                            dataKey = 'ecomCustomers';
                        }
                        endpoint = '/api/3/ecomCustomers';
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else if (resource === 'ecommerceOrderProducts') {
                    if (operation === 'getByProductId') {
                        // ----------------------------------
                        //         ecommerceOrderProducts:getByProductId
                        // ----------------------------------
                        requestMethod = 'GET';
                        const procuctId = this.getNodeParameter('procuctId', i);
                        endpoint = `/api/3/ecomOrderProducts/${procuctId}`;
                    }
                    else if (operation === 'getByOrderId') {
                        // ----------------------------------
                        //         ecommerceOrderProducts:getByOrderId
                        // ----------------------------------
                        requestMethod = 'GET';
                        //dataKey = 'ecomOrderProducts';
                        const orderId = this.getNodeParameter('orderId', i);
                        endpoint = `/api/3/ecomOrders/${orderId}/orderProducts`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         ecommerceOrderProductss:getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const simple = this.getNodeParameter('simple', i, true);
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        if (simple) {
                            dataKey = 'ecomOrderProducts';
                        }
                        endpoint = '/api/3/ecomOrderProducts';
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`, { itemIndex: i });
                    }
                }
                else {
                    throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
                        itemIndex: i,
                    });
                }
                let responseData;
                if (returnAll) {
                    responseData = await activeCampaignApiRequestAllItems.call(this, requestMethod, endpoint, body, qs, dataKey);
                }
                else {
                    responseData = await activeCampaignApiRequest.call(this, requestMethod, endpoint, body, qs, dataKey);
                }
                if (resource === 'contactList' && operation === 'add' && responseData === undefined) {
                    responseData = { success: true };
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
//# sourceMappingURL=ActiveCampaign.node.js.map