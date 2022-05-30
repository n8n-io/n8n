import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	bitwardenApiRequest as tokenlessBitwardenApiRequest,
	getAccessToken,
	handleGetAll as tokenlessHandleGetAll,
	loadResource,
} from './GenericFunctions';

import {
	collectionFields,
	collectionOperations,
	CollectionUpdateFields,
} from './descriptions/CollectionDescription';

import {
	eventFields,
	eventOperations,
} from './descriptions/EventDescription';

import {
	GroupCreationAdditionalFields,
	groupFields,
	groupOperations,
	GroupUpdateFields,
} from './descriptions/GroupDescription';

import {
	MemberCreationAdditionalFields,
	memberFields,
	memberOperations,
	MemberUpdateFields,
} from './descriptions/MemberDescription';

import {
	isEmpty,
	partialRight,
} from 'lodash';

export class Bitwarden implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bitwarden',
		name: 'bitwarden',
		icon: 'file:bitwarden.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Bitwarden API',
		defaults: {
			name: 'Bitwarden',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'bitwardenApi',
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
						name: 'Collection',
						value: 'collection',
					},
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'Member',
						value: 'member',
					},
				],
				default: 'collection',
			},
			...collectionOperations,
			...collectionFields,
			...eventOperations,
			...eventFields,
			...groupOperations,
			...groupFields,
			...memberOperations,
			...memberFields,
		],
	};

	methods = {
		loadOptions: {
			async getGroups(this: ILoadOptionsFunctions) {
				return await loadResource.call(this, 'groups');
			},

			async getCollections(this: ILoadOptionsFunctions) {
				return await loadResource.call(this, 'collections');
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		const token = await getAccessToken.call(this);
		const bitwardenApiRequest = partialRight(tokenlessBitwardenApiRequest, token);
		const handleGetAll = partialRight(tokenlessHandleGetAll, token);

		for (let i = 0; i < items.length; i++) {

			if (resource === 'collection') {

				// *********************************************************************
				//       collection
				// *********************************************************************

				if (operation === 'delete') {

					// ----------------------------------
					//       collection: delete
					// ----------------------------------

					const id = this.getNodeParameter('collectionId', i);
					const endpoint = `/public/collections/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'DELETE', endpoint, {}, {});
					responseData = { success: true };

				} else if (operation === 'get') {

					// ----------------------------------
					//        collection: get
					// ----------------------------------

					const id = this.getNodeParameter('collectionId', i);
					const endpoint = `/public/collections/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//       collection: getAll
					// ----------------------------------

					const endpoint = '/public/collections';
					responseData = await handleGetAll.call(this, i, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//       collection: update
					// ----------------------------------

					const updateFields = this.getNodeParameter('updateFields', i) as CollectionUpdateFields;

					if (isEmpty(updateFields)) {
						throw new NodeOperationError(this.getNode(), `Please enter at least one field to update for the ${resource}.`);
					}

					const { groups, externalId } = updateFields;

					const body = {} as IDataObject;

					if (groups) {
						body.groups = groups.map((groupId) => ({
							id: groupId,
							ReadOnly: false,
						}));
					}

					if (externalId) {
						body.externalId = externalId;
					}

					const id = this.getNodeParameter('collectionId', i);
					const endpoint = `/public/collections/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, body);

				}

			} else if (resource === 'event') {

				// *********************************************************************
				//       event
				// *********************************************************************

				if (operation === 'getAll') {

					// ----------------------------------
					//         event: getAll
					// ----------------------------------

					const filters = this.getNodeParameter('filters', i) as IDataObject;
					const qs = isEmpty(filters) ? {} : filters;
					const endpoint = '/public/events';
					responseData = await handleGetAll.call(this, i, 'GET', endpoint, qs, {});

				}

			} else if (resource === 'group') {

				// *********************************************************************
				//       group
				// *********************************************************************

				if (operation === 'create') {

					// ----------------------------------
					//       group: create
					// ----------------------------------

					const body = {
						name: this.getNodeParameter('name', i),
						AccessAll: this.getNodeParameter('accessAll', i),
					} as IDataObject;

					const {
						collections,
						externalId,
					} = this.getNodeParameter('additionalFields', i) as GroupCreationAdditionalFields;

					if (collections) {
						body.collections = collections.map((collectionId) => ({
							id: collectionId,
							ReadOnly: false,
						}));
					}

					if (externalId) {
						body.externalId = externalId;
					}

					const endpoint = '/public/groups';
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, body);

				} else if (operation === 'delete') {

					// ----------------------------------
					//       group: delete
					// ----------------------------------

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'DELETE', endpoint, {}, {});
					responseData = { success: true };

				} else if (operation === 'get') {

					// ----------------------------------
					//        group: get
					// ----------------------------------

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//       group: getAll
					// ----------------------------------

					const endpoint = '/public/groups';
					responseData = await handleGetAll.call(this, i, 'GET', endpoint, {}, {});

				} else if (operation === 'getMembers') {

					// ----------------------------------
					//       group: getMembers
					// ----------------------------------

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}/member-ids`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});
					responseData = responseData.map((memberId: string) => ({ memberId }));

				} else if (operation === 'update') {

					// ----------------------------------
					//       group: update
					// ----------------------------------

					const groupId = this.getNodeParameter('groupId', i);

					const updateFields = this.getNodeParameter('updateFields', i) as GroupUpdateFields;

					if (isEmpty(updateFields)) {
						throw new NodeOperationError(this.getNode(), `Please enter at least one field to update for the ${resource}.`);
					}

					// set defaults for `name` and `accessAll`, required by Bitwarden but optional in n8n

					let { name, accessAll } = updateFields;

					if (name === undefined) {
						responseData = await bitwardenApiRequest.call(this, 'GET', `/public/groups/${groupId}`, {}, {}) as { name: string };
						name = responseData.name;
					}

					if (accessAll === undefined) {
						accessAll = false;
					}

					const body = {
						name,
						AccessAll: accessAll,
					} as IDataObject;

					const { collections, externalId } = updateFields;

					if (collections) {
						body.collections = collections.map((collectionId) => ({
							id: collectionId,
							ReadOnly: false,
						}));
					}

					if (externalId) {
						body.externalId = externalId;
					}

					const endpoint = `/public/groups/${groupId}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, body);

				} else if (operation === 'updateMembers') {

					// ----------------------------------
					//       group: updateMembers
					// ----------------------------------

					const memberIds = this.getNodeParameter('memberIds', i) as string;

					const body = {
						memberIds: memberIds.includes(',') ? memberIds.split(',') : [memberIds],
					};

					const groupId = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${groupId}/member-ids`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, body);
					responseData = { success: true };
				}

			} else if (resource === 'member') {

				// *********************************************************************
				//       member
				// *********************************************************************

				if (operation === 'create') {

					// ----------------------------------
					//       member: create
					// ----------------------------------

					const body = {
						email: this.getNodeParameter('email', i),
						type: this.getNodeParameter('type', i),
						AccessAll: this.getNodeParameter('accessAll', i),
					} as IDataObject;

					const {
						collections,
						externalId,
					} = this.getNodeParameter('additionalFields', i) as MemberCreationAdditionalFields;

					if (collections) {
						body.collections = collections.map((collectionId) => ({
							id: collectionId,
							ReadOnly: false,
						}));
					}

					if (externalId) {
						body.externalId = externalId;
					}

					const endpoint = '/public/members/';
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, body);

				} else if (operation === 'delete') {

					// ----------------------------------
					//       member: delete
					// ----------------------------------

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'DELETE', endpoint, {}, {});
					responseData = { success: true };

				} else if (operation === 'get') {

					// ----------------------------------
					//        member: get
					// ----------------------------------

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//       member: getAll
					// ----------------------------------

					const endpoint = '/public/members';
					responseData = await handleGetAll.call(this, i, 'GET', endpoint, {}, {});

				} else if (operation === 'getGroups') {

					// ----------------------------------
					//       member: getGroups
					// ----------------------------------

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}/group-ids`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});
					responseData = responseData.map((groupId: string) => ({ groupId }));

				} else if (operation === 'update') {

					// ----------------------------------
					//       member: update
					// ----------------------------------

					const body = {} as IDataObject;

					const updateFields = this.getNodeParameter('updateFields', i) as MemberUpdateFields;

					if (isEmpty(updateFields)) {
						throw new NodeOperationError(this.getNode(), `Please enter at least one field to update for the ${resource}.`);
					}

					const { accessAll, collections, externalId, type } = updateFields;

					if (accessAll !== undefined) {
						body.AccessAll = accessAll;
					}

					if (collections) {
						body.collections = collections.map((collectionId) => ({
							id: collectionId,
							ReadOnly: false,
						}));
					}

					if (externalId) {
						body.externalId = externalId;
					}

					if (type !== undefined) {
						body.Type = type;
					}

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, body);

				} else if (operation === 'updateGroups') {

					// ----------------------------------
					//       member: updateGroups
					// ----------------------------------

					const groupIds = this.getNodeParameter('groupIds', i) as string;

					const body = {
						groupIds: groupIds.includes(',') ? groupIds.split(',') : [groupIds],
					};

					const memberId = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${memberId}/group-ids`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, body);
					responseData = { success: true };
				}
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
