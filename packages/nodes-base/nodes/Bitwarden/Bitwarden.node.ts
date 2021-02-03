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
} from 'n8n-workflow';

import {
	bitwardenApiRequest as tokenlessBitwardenApiRequest,
	getAccessToken,
	handleGetAll as tokenlessGetAll,
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
	memberFields,
	memberOperations,
} from './descriptions/MemberDescription';

import {
	organizationOperations,
} from './descriptions/OrganizationDescription';

import {
	policyFields,
	policyOperations,
} from './descriptions/PolicyDescription';

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
			color: '#6610f2',
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
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Policy',
						value: 'policy',
					},
				],
				default: 'collection',
				description: 'Resource to consume',
			},
			...collectionOperations,
			...collectionFields,
			...eventOperations,
			...eventFields,
			...groupOperations,
			...groupFields,
			...memberOperations,
			...memberFields,
			...organizationOperations,
			...policyOperations,
			...policyFields,
		],
	};

	methods = {
		loadOptions: {
			async getGroups(this: ILoadOptionsFunctions) {

				const returnData: INodePropertyOptions[] = [];
				const token =  await getAccessToken.call(this);
				const endpoint = '/public/groups';

				const { data } = await tokenlessBitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, token);

				data.forEach(({ id, name }: { id: string, name: string }) => {
					returnData.push({
						name: name || 'Unnamed',
						value: id,
					});
				});

				return returnData;
			},

			async getCollections(this: ILoadOptionsFunctions) {

				const returnData: INodePropertyOptions[] = [];
				const token =  await getAccessToken.call(this);
				const endpoint = '/public/collections';

				const { data } = await tokenlessBitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, token);

				console.log(data);

				data.forEach(({ id, externalId }: { id: string, externalId: string }) => {
					returnData.push({
						name: externalId || 'Unnamed',
						value: id,
					});
				});

				return returnData;
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
		const handleGetAll = partialRight(tokenlessGetAll, token);

		for (let i = 0; i < items.length; i++) {

			// *********************************************************************
			// 															collection
			// *********************************************************************

			if (resource === 'collection')	{

				// ----------------------------------
				//       collection: delete
				// ----------------------------------

				if (operation === 'delete') {

					const id = this.getNodeParameter('collectionId', i);
					const endpoint = `/public/collections/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'DELETE', endpoint, {}, {});

				// ----------------------------------
				//        collection: get
				// ----------------------------------

				} else if (operation === 'get') {

					const id = this.getNodeParameter('collectionId', i);
					const endpoint = `/public/collections/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       collection: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = '/public/collections';
					responseData = await handleGetAll.call(this, i, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       collection: update
				// ----------------------------------

				} else if (operation === 'update') {

					const updateFields = this.getNodeParameter('updateFields', i) as CollectionUpdateFields;

					if (isEmpty(updateFields)) {
						throw new Error(`Please enter at least one field to update for the ${resource}.`);
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

			// *********************************************************************
			// 															event
			// *********************************************************************

			} else if (resource === 'event') {

				// ----------------------------------
				//         event: getAll
				// ----------------------------------

				if (operation === 'getAll') {

					const filters = this.getNodeParameter('filters', i) as IDataObject;
					const qs = isEmpty(filters) ? {} : filters;
					const endpoint = '/public/events';
					responseData = await handleGetAll.call(this, i, 'GET', endpoint, qs, {});

				}

			// *********************************************************************
			// 															group
			// *********************************************************************

			} else if (resource === 'group') {

				// ----------------------------------
				//       group: create
				// ----------------------------------

				if (operation === 'create') {

					const body = {
						name: this.getNodeParameter('name', i),
					} as IDataObject;

					const {
						collections,
						externalId,
						accessAll,
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

					body.AccessAll = accessAll || false;

					const endpoint = '/public/groups';
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, body);

				// ----------------------------------
				//       group: delete
				// ----------------------------------

				} else if (operation === 'delete') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'DELETE', endpoint, {}, {});

				// ----------------------------------
				//        group: get
				// ----------------------------------

				} else if (operation === 'get') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       group: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = '/public/groups';
					responseData = await handleGetAll.call(this, i, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       group: getMembers
				// ----------------------------------

				} else if (operation === 'getMembers') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}/member-ids`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});
					responseData = responseData.map((memberId: string) => ({ memberId }));

				// ----------------------------------
				//       group: update
				// ----------------------------------

				} else if (operation === 'update') {

					const body = {} as IDataObject;

					const {
						name,
						collections,
						externalId,
						accessAll,
					} = this.getNodeParameter('updateFields', i) as GroupUpdateFields;

					if (collections) {
						body.collections = collections.map((collectionId) => ({
							id: collectionId,
							ReadOnly: false,
						}));
					}

					if (name) {
						body.name = name;
					}

					if (externalId) {
						body.externalId = externalId;
					}

					body.AccessAll = accessAll || false;

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, body);

				// ----------------------------------
				//       group: updateMembers
				// ----------------------------------

				} else if (operation === 'updateMembers') {

					const memberIds = this.getNodeParameter('memberIds', i) as string;

					const body = {
						memberIds: memberIds.includes(',') ? memberIds.split(',') : [memberIds],
					};

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}/member-ids`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, body);
					responseData = { success: true };
				}

			// *********************************************************************
			// 															member
			// *********************************************************************

			} else if (resource === 'member') {

				// ----------------------------------
				//       member: create
				// ----------------------------------

				if (operation === 'create') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, {});

				// ----------------------------------
				//       member: delete
				// ----------------------------------

				} else if (operation === 'delete') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'DELETE', endpoint, {}, {});

				// ----------------------------------
				//        member: get
				// ----------------------------------

				} else if (operation === 'get') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       member: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = '/public/members';
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       member: getGroups
				// ----------------------------------

				} else if (operation === 'getGroups') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}/group-ids`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       member: reinvite
				// ----------------------------------

				} else if (operation === 'reinvite') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}/reinvite`;
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, {});

				// ----------------------------------
				//       member: updateGroups
				// ----------------------------------

				} else if (operation === 'updateGroups') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}/group-ids`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {});

				// ----------------------------------
				//       member: update
				// ----------------------------------

				} else if (operation === 'update') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {});

				}

			// *********************************************************************
			// 															organization
			// *********************************************************************

			} else if (resource === 'organization') {

				// ----------------------------------
				//       organization: import
				// ----------------------------------

				if (operation === 'import') {

					const endpoint = '/public/organization/import';
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, {});

				}

			// *********************************************************************
			// 															policy
			// *********************************************************************

			} else if (resource === 'policy') {

				// ----------------------------------
				//       policy: get
				// ----------------------------------

				if (operation === 'get') {

					const id = this.getNodeParameter('policyId', i);
					const endpoint = `/public/policies/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       policy: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = '/public/policies';
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//        policy: update
				// ----------------------------------

				} else if (operation === 'update') {

					const id = this.getNodeParameter('policyId', i);
					const endpoint = `/public/policies/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {});

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

			}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
