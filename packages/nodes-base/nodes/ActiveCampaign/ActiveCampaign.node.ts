import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	activeCampaignApiRequest,
	activeCampaignApiRequestAllItems,
	IProduct,
} from './GenericFunctions';

import {
	contactFields,
	contactOperations,
} from './ContactDescription';

import {
	dealFields,
	dealOperations,
} from './DealDescription';

import {
	ecomOrderFields,
	ecomOrderOperations,
} from './EcomOrderDescription';

import {
	ecomCustomerFields,
	ecomCustomerOperations,
} from './EcomCustomerDescription';

import {
	ecomOrderProductsFields,
	ecomOrderProductsOperations,
} from './EcomOrderProductsDescription';

import {
	connectionFields,
	connectionOperations,
} from './ConnectionDescription';

import {
	accountFields,
	accountOperations
} from './AccountDescription';

import {
	tagFields,
	tagOperations
} from './TagDescription';

import {
	accountContactFields,
	accountContactOperations
} from './AccountContactDescription';

import {
	contactListFields,
	contactListOperations,
} from './ContactListDescription';

import {
	contactTagFields,
	contactTagOperations,
} from './ContactTagDescription';

import {
	listFields,
	listOperations,
} from './ListDescription';

interface CustomProperty {
	name: string;
	value: string;
}

/**
 * Add the additional fields to the body
 *
 * @param {IDataObject} body The body object to add fields to
 * @param {IDataObject} additionalFields The fields to add
 */
function addAdditionalFields(body: IDataObject, additionalFields: IDataObject) {
	for (const key of Object.keys(additionalFields)) {
		if (key === 'customProperties' && (additionalFields.customProperties as IDataObject).property !== undefined) {
			for (const customProperty of (additionalFields.customProperties as IDataObject)!.property! as CustomProperty[]) {
				body[customProperty.name] = customProperty.value;
			}
		} else if (key === 'fieldValues' && (additionalFields.fieldValues as IDataObject).property !== undefined) {
			body.fieldValues = (additionalFields.fieldValues as IDataObject).property;
		} else if (key === 'fields' && (additionalFields.fields as IDataObject).property !== undefined) {
			body.fields = (additionalFields.fields as IDataObject).property;
		} else {
			body[key] = additionalFields[key];
		}
	}
}

export class ActiveCampaign implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ActiveCampaign',
		name: 'activeCampaign',
		icon: 'file:activeCampaign.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and edit data in ActiveCampaign',
		defaults: {
			name: 'ActiveCampaign',
		},
		inputs: ['main'],
		outputs: ['main'],
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
						name: 'Connection',
						value: 'connection',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'E-commerce Order',
						value: 'ecommerceOrder',
					},
					{
						name: 'E-Commerce Customer',
						value: 'ecommerceCustomer',
					},
					{
						name: 'E-commerce Order Products',
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
				description: 'The resource to operate on.',
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
			// Get all the available custom fields to display them to user so that he can
			// select them easily
			async getContactCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
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
			// Get all the available custom fields to display them to user so that he can
			// select them easily
			async getAccountCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
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
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { tags } = await activeCampaignApiRequest.call(this, 'GET', '/api/3/tags', {}, { limit: 100 });
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let resource: string;
		let operation: string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;
		let returnAll = false;
		let dataKey: string | undefined;

		for (let i = 0; i < items.length; i++) {
			try {

				dataKey = undefined;
				resource = this.getNodeParameter('resource', 0) as string;
				operation = this.getNodeParameter('operation', 0) as string;

				requestMethod = 'GET';
				endpoint = '';
				body = {} as IDataObject;
				qs = {} as IDataObject;

				if (resource === 'contact') {
					if (operation === 'create') {
						// ----------------------------------
						//         contact:create
						// ----------------------------------

						requestMethod = 'POST';

						const updateIfExists = this.getNodeParameter('updateIfExists', i) as boolean;
						if (updateIfExists === true) {
							endpoint = '/api/3/contact/sync';
						} else {
							endpoint = '/api/3/contacts';
						}

						dataKey = 'contact';

						body.contact = {
							email: this.getNodeParameter('email', i) as string,
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						addAdditionalFields(body.contact as IDataObject, additionalFields);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         contact:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const contactId = this.getNodeParameter('contactId', i) as number;
						endpoint = `/api/3/contacts/${contactId}`;

					} else if (operation === 'get') {
						// ----------------------------------
						//         contact:get
						// ----------------------------------

						requestMethod = 'GET';

						const contactId = this.getNodeParameter('contactId', i) as number;
						endpoint = `/api/3/contacts/${contactId}`;

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         contacts:getAll
						// ----------------------------------

						requestMethod = 'GET';

						returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const simple = this.getNodeParameter('simple', i, true) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						Object.assign(qs, additionalFields);

						if (qs.orderBy) {
							qs[qs.orderBy as string] = true;
							delete qs.orderBy;
						}

						if (simple === true) {
							dataKey = 'contacts';
						}

						endpoint = `/api/3/contacts`;

					} else if (operation === 'update') {
						// ----------------------------------
						//         contact:update
						// ----------------------------------

						requestMethod = 'PUT';

						const contactId = this.getNodeParameter('contactId', i) as number;
						endpoint = `/api/3/contacts/${contactId}`;

						dataKey = 'contact';

						body.contact = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						addAdditionalFields(body.contact as IDataObject, updateFields);

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'account') {
					if (operation === 'create') {
						// ----------------------------------
						//         account:create
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/accounts';

						dataKey = 'account';

						body.account = {
							name: this.getNodeParameter('name', i) as string,
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						addAdditionalFields(body.account as IDataObject, additionalFields);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         account:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const accountId = this.getNodeParameter('accountId', i) as number;
						endpoint = `/api/3/accounts/${accountId}`;

					} else if (operation === 'get') {
						// ----------------------------------
						//         account:get
						// ----------------------------------

						requestMethod = 'GET';

						const accountId = this.getNodeParameter('accountId', i) as number;
						endpoint = `/api/3/accounts/${accountId}`;

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         account:getAll
						// ----------------------------------

						requestMethod = 'GET';

						const simple = this.getNodeParameter('simple', i, true) as boolean;
						returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						if (simple === true) {
							dataKey = 'accounts';
						}

						endpoint = `/api/3/accounts`;

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						Object.assign(qs, filters);

					} else if (operation === 'update') {
						// ----------------------------------
						//         account:update
						// ----------------------------------

						requestMethod = 'PUT';

						const accountId = this.getNodeParameter('accountId', i) as number;
						endpoint = `/api/3/accounts/${accountId}`;

						dataKey = 'account';

						body.account = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						addAdditionalFields(body.account as IDataObject, updateFields);

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'accountContact') {
					if (operation === 'create') {
						// ----------------------------------
						//         account:create
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/accountContacts';

						dataKey = 'accountContact';

						body.accountContact = {
							contact: this.getNodeParameter('contact', i) as string,
							account: this.getNodeParameter('account', i) as string,
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						addAdditionalFields(body.account as IDataObject, additionalFields);

					} else if (operation === 'update') {
						// ----------------------------------
						//         accountContact:update
						// ----------------------------------

						requestMethod = 'PUT';

						const accountContactId = this.getNodeParameter('accountContactId', i) as number;
						endpoint = `/api/3/accountContacts/${accountContactId}`;

						dataKey = 'accountContact';

						body.accountContact = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						addAdditionalFields(body.accountContact as IDataObject, updateFields);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         accountContact:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const accountContactId = this.getNodeParameter('accountContactId', i) as number;
						endpoint = `/api/3/accountContacts/${accountContactId}`;

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'contactTag') {
					if (operation === 'add') {
						// ----------------------------------
						//         contactTag:add
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/contactTags';

						dataKey = 'contactTag';

						body.contactTag = {
							contact: this.getNodeParameter('contactId', i) as string,
							tag: this.getNodeParameter('tagId', i) as string,
						} as IDataObject;

					} else if (operation === 'remove') {
						// ----------------------------------
						//         contactTag:remove
						// ----------------------------------

						requestMethod = 'DELETE';

						const contactTagId = this.getNodeParameter('contactTagId', i) as number;
						endpoint = `/api/3/contactTags/${contactTagId}`;

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'contactList') {
					if (operation === 'add') {
						// ----------------------------------
						//         contactList:add
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/contactLists';

						dataKey = 'contactTag';

						body.contactList = {
							list: this.getNodeParameter('listId', i) as string,
							contact: this.getNodeParameter('contactId', i) as string,
							status: 1,
						} as IDataObject;

					} else if (operation === 'remove') {
						// ----------------------------------
						//         contactList:remove
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/contactLists';

						body.contactList = {
							list: this.getNodeParameter('listId', i) as string,
							contact: this.getNodeParameter('contactId', i) as string,
							status: 2,
						} as IDataObject;

						dataKey = 'contacts';

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'list') {
					if (operation === 'getAll') {
						// ----------------------------------
						//         list:getAll
						// ----------------------------------

						requestMethod = 'GET';

						returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const simple = this.getNodeParameter('simple', i, true) as boolean;


						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						if (simple === true) {
							dataKey = 'lists';
						}

						endpoint = `/api/3/lists`;
					}

				} else if (resource === 'tag') {
					if (operation === 'create') {
						// ----------------------------------
						//         tag:create
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/tags';

						dataKey = 'tag';

						body.tag = {
							tag: this.getNodeParameter('name', i) as string,
							tagType: this.getNodeParameter('tagType', i) as string,
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						addAdditionalFields(body.tag as IDataObject, additionalFields);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         tag:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const tagId = this.getNodeParameter('tagId', i) as number;
						endpoint = `/api/3/tags/${tagId}`;

					} else if (operation === 'get') {
						// ----------------------------------
						//         tag:get
						// ----------------------------------

						requestMethod = 'GET';

						const tagId = this.getNodeParameter('tagId', i) as number;
						endpoint = `/api/3/tags/${tagId}`;

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         tags:getAll
						// ----------------------------------

						requestMethod = 'GET';

						const simple = this.getNodeParameter('simple', i, true) as boolean;
						returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						if (simple === true) {
							dataKey = 'tags';
						}

						endpoint = `/api/3/tags`;

					} else if (operation === 'update') {
						// ----------------------------------
						//         tags:update
						// ----------------------------------

						requestMethod = 'PUT';

						const tagId = this.getNodeParameter('tagId', i) as number;
						endpoint = `/api/3/tags/${tagId}`;

						dataKey = 'tag';

						body.tag = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						addAdditionalFields(body.tag as IDataObject, updateFields);

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'deal') {
					if (operation === 'create') {
						// ----------------------------------
						//         deal:create
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/deals';

						body.deal = {
							title: this.getNodeParameter('title', i) as string,
							contact: this.getNodeParameter('contact', i) as string,
							value: this.getNodeParameter('value', i) as number,
							currency: this.getNodeParameter('currency', i) as string,
						} as IDataObject;

						const group = this.getNodeParameter('group', i) as string;
						if (group !== '') {
							addAdditionalFields(body.deal as IDataObject, { group });
						}

						const owner = this.getNodeParameter('owner', i) as string;
						if (owner !== '') {
							addAdditionalFields(body.deal as IDataObject, { owner });
						}

						const stage = this.getNodeParameter('stage', i) as string;
						if (stage !== '') {
							addAdditionalFields(body.deal as IDataObject, { stage });
						}

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						addAdditionalFields(body.deal as IDataObject, additionalFields);

					} else if (operation === 'update') {
						// ----------------------------------
						//         deal:update
						// ----------------------------------

						requestMethod = 'PUT';

						const dealId = this.getNodeParameter('dealId', i) as number;
						endpoint = `/api/3/deals/${dealId}`;

						body.deal = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						addAdditionalFields(body.deal as IDataObject, updateFields);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         deal:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const dealId = this.getNodeParameter('dealId', i) as number;
						endpoint = `/api/3/deals/${dealId}`;

					} else if (operation === 'get') {
						// ----------------------------------
						//         deal:get
						// ----------------------------------

						requestMethod = 'GET';

						const dealId = this.getNodeParameter('dealId', i) as number;
						endpoint = `/api/3/deals/${dealId}`;

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         deals:getAll
						// ----------------------------------

						requestMethod = 'GET';

						const simple = this.getNodeParameter('simple', i, true) as boolean;
						returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						if (simple === true) {
							dataKey = 'deals';
						}

						endpoint = `/api/3/deals`;

					} else if (operation === 'createNote') {
						// ----------------------------------
						//         deal:createNote
						// ----------------------------------
						requestMethod = 'POST';

						body.note = {
							note: this.getNodeParameter('dealNote', i) as string,
						} as IDataObject;

						const dealId = this.getNodeParameter('dealId', i) as number;
						endpoint = `/api/3/deals/${dealId}/notes`;

					} else if (operation === 'updateNote') {
						// ----------------------------------
						//         deal:updateNote
						// ----------------------------------
						requestMethod = 'PUT';

						body.note = {
							note: this.getNodeParameter('dealNote', i) as string,
						} as IDataObject;

						const dealId = this.getNodeParameter('dealId', i) as number;
						const dealNoteId = this.getNodeParameter('dealNoteId', i) as number;
						endpoint = `/api/3/deals/${dealId}/notes/${dealNoteId}`;

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'connection') {
					if (operation === 'create') {
						// ----------------------------------
						//         connection:create
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/connections';

						body.connection = {
							service: this.getNodeParameter('service', i) as string,
							externalid: this.getNodeParameter('externalid', i) as string,
							name: this.getNodeParameter('name', i) as string,
							logoUrl: this.getNodeParameter('logoUrl', i) as string,
							linkUrl: this.getNodeParameter('linkUrl', i) as string,
						} as IDataObject;

					} else if (operation === 'update') {
						// ----------------------------------
						//         connection:update
						// ----------------------------------

						requestMethod = 'PUT';

						const connectionId = this.getNodeParameter('connectionId', i) as number;
						endpoint = `/api/3/connections/${connectionId}`;

						body.connection = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						addAdditionalFields(body.connection as IDataObject, updateFields);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         connection:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const connectionId = this.getNodeParameter('connectionId', i) as number;
						endpoint = `/api/3/connections/${connectionId}`;

					} else if (operation === 'get') {
						// ----------------------------------
						//         connection:get
						// ----------------------------------

						requestMethod = 'GET';

						const connectionId = this.getNodeParameter('connectionId', i) as number;
						endpoint = `/api/3/connections/${connectionId}`;

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         connections:getAll
						// ----------------------------------

						requestMethod = 'GET';

						const simple = this.getNodeParameter('simple', i, true) as boolean;
						returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						if (simple === true) {
							dataKey = 'connections';
						}

						endpoint = `/api/3/connections`;

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'ecommerceOrder') {
					if (operation === 'create') {
						// ----------------------------------
						//         ecommerceOrder:create
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/ecomOrders';

						body.ecomOrder = {
							source: this.getNodeParameter('source', i) as string,
							email: this.getNodeParameter('email', i) as string,
							totalPrice: this.getNodeParameter('totalPrice', i) as number,
							currency: this.getNodeParameter('currency', i)!.toString().toUpperCase() as string,
							externalCreatedDate: this.getNodeParameter('externalCreatedDate', i) as string,
							connectionid: this.getNodeParameter('connectionid', i) as number,
							customerid: this.getNodeParameter('customerid', i) as number,
						} as IDataObject;

						const externalid = this.getNodeParameter('externalid', i) as string;
						if (externalid !== '') {
							addAdditionalFields(body.ecomOrder as IDataObject, { externalid });
						}

						const externalcheckoutid = this.getNodeParameter('externalcheckoutid', i) as string;
						if (externalcheckoutid !== '') {
							addAdditionalFields(body.ecomOrder as IDataObject, { externalcheckoutid });
						}

						const abandonedDate = this.getNodeParameter('abandonedDate', i) as string;
						if (abandonedDate !== '') {
							addAdditionalFields(body.ecomOrder as IDataObject, { abandonedDate });
						}

						const orderProducts = this.getNodeParameter('orderProducts', i) as unknown as IProduct[];
						addAdditionalFields(body.ecomOrder as IDataObject, { orderProducts });

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						addAdditionalFields(body.ecomOrder as IDataObject, additionalFields);

					} else if (operation === 'update') {
						// ----------------------------------
						//         ecommerceOrder:update
						// ----------------------------------

						requestMethod = 'PUT';

						const orderId = this.getNodeParameter('orderId', i) as number;
						endpoint = `/api/3/ecomOrders/${orderId}`;

						body.ecomOrder = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						addAdditionalFields(body.ecomOrder as IDataObject, updateFields);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         ecommerceOrder:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const orderId = this.getNodeParameter('orderId', i) as number;
						endpoint = `/api/3/ecomOrders/${orderId}`;

					} else if (operation === 'get') {
						// ----------------------------------
						//         ecommerceOrder:get
						// ----------------------------------

						requestMethod = 'GET';

						const orderId = this.getNodeParameter('orderId', i) as number;
						endpoint = `/api/3/ecomOrders/${orderId}`;

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         ecommerceOrders:getAll
						// ----------------------------------

						requestMethod = 'GET';

						const simple = this.getNodeParameter('simple', i, true) as boolean;
						returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						if (simple === true) {
							dataKey = 'ecomOrders';
						}

						endpoint = `/api/3/ecomOrders`;

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'ecommerceCustomer') {
					if (operation === 'create') {
						// ----------------------------------
						//         ecommerceCustomer:create
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = '/api/3/ecomCustomers';

						body.ecomCustomer = {
							connectionid: this.getNodeParameter('connectionid', i) as string,
							externalid: this.getNodeParameter('externalid', i) as string,
							email: this.getNodeParameter('email', i) as string,
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if (additionalFields.acceptsMarketing !== undefined) {
							if (additionalFields.acceptsMarketing === true) {
								additionalFields.acceptsMarketing = '1';
							} else {
								additionalFields.acceptsMarketing = '0';
							}
						}
						addAdditionalFields(body.ecomCustomer as IDataObject, additionalFields);

					} else if (operation === 'update') {
						// ----------------------------------
						//         ecommerceCustomer:update
						// ----------------------------------

						requestMethod = 'PUT';

						const ecommerceCustomerId = this.getNodeParameter('ecommerceCustomerId', i) as number;
						endpoint = `/api/3/ecomCustomers/${ecommerceCustomerId}`;

						body.ecomCustomer = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						if (updateFields.acceptsMarketing !== undefined) {
							if (updateFields.acceptsMarketing === true) {
								updateFields.acceptsMarketing = '1';
							} else {
								updateFields.acceptsMarketing = '0';
							}
						}
						addAdditionalFields(body.ecomCustomer as IDataObject, updateFields);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         ecommerceCustomer:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const ecommerceCustomerId = this.getNodeParameter('ecommerceCustomerId', i) as number;
						endpoint = `/api/3/ecomCustomers/${ecommerceCustomerId}`;

					} else if (operation === 'get') {
						// ----------------------------------
						//         ecommerceCustomer:get
						// ----------------------------------

						requestMethod = 'GET';

						const ecommerceCustomerId = this.getNodeParameter('ecommerceCustomerId', i) as number;
						endpoint = `/api/3/ecomCustomers/${ecommerceCustomerId}`;

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         ecommerceCustomers:getAll
						// ----------------------------------

						requestMethod = 'GET';

						const simple = this.getNodeParameter('simple', i, true) as boolean;
						returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						if (simple === true) {
							dataKey = 'ecomCustomers';
						}

						endpoint = `/api/3/ecomCustomers`;

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}
				} else if (resource === 'ecommerceOrderProducts') {
					if (operation === 'getByProductId') {
						// ----------------------------------
						//         ecommerceOrderProducts:getByProductId
						// ----------------------------------

						requestMethod = 'GET';

						const procuctId = this.getNodeParameter('procuctId', i) as number;
						endpoint = `/api/3/ecomOrderProducts/${procuctId}`;


					} else if (operation === 'getByOrderId') {
						// ----------------------------------
						//         ecommerceOrderProducts:getByOrderId
						// ----------------------------------

						requestMethod = 'GET';

						//dataKey = 'ecomOrderProducts';

						const orderId = this.getNodeParameter('orderId', i) as number;
						endpoint = `/api/3/ecomOrders/${orderId}/orderProducts`;

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         ecommerceOrderProductss:getAll
						// ----------------------------------

						requestMethod = 'GET';

						const simple = this.getNodeParameter('simple', i, true) as boolean;
						returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						if (simple === true) {
							dataKey = 'ecomOrderProducts';
						}

						endpoint = `/api/3/ecomOrderProducts`;

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known`);
					}

				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
				}

				let responseData;
				if (returnAll === true) {
					responseData = await activeCampaignApiRequestAllItems.call(this, requestMethod, endpoint, body, qs, dataKey);
				} else {
					responseData = await activeCampaignApiRequest.call(this, requestMethod, endpoint, body, qs, dataKey);
				}

				if (resource === 'contactList' && operation === 'add' && responseData === undefined) {
					responseData = { success: true };
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
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
