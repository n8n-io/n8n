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
	bitwardenApiRequest, getAccessToken,
} from './GenericFunctions';

import {
	collectionFields,
	collectionOperations,
	CollectionUpdateFields,
} from './descriptions/CollectionDescription';

import {
	eventOperations,
} from './descriptions/EventDescription';

import {
	groupFields,
	groupOperations,
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
	isEmpty
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
				const accessToken =  await getAccessToken.call(this);
				const endpoint = '/public/groups';

				const { data } = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				data.forEach(({ id, name }: { id: string, name: string }) => {
					returnData.push({
						name,
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

		const accessToken =  await getAccessToken.call(this);

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
					responseData = await bitwardenApiRequest.call(this, 'DELETE', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//        collection: get
				// ----------------------------------

				} else if (operation === 'get') {

					const id = this.getNodeParameter('collectionId', i);
					const endpoint = `/public/collections/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       collection: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = '/public/collections';
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       collection: update
				// ----------------------------------

				} else if (operation === 'update') {

					const updateFields = this.getNodeParameter('updateFields', i) as CollectionUpdateFields;

					if (isEmpty(updateFields)) {
						throw new Error(`Please enter at least one field to update for the ${resource}.`);
					}

					const { readOnly, groups, externalId } = updateFields;

					if (readOnly !== undefined && !groups) {
						throw new Error('To set the property "read only", please set a group as well.');
					}

					const body = {} as IDataObject;

					if (groups) {
						body.groups = groups.map((groupId) => ({
							id: groupId,
							ReadOnly: updateFields.readOnly || false,
						}));
					}

					if (externalId) {
						body.externalId = externalId;
					}

					const id = this.getNodeParameter('collectionId', i);
					const endpoint = `/public/collections/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, body, accessToken);

				}

			// *********************************************************************
			// 															event
			// *********************************************************************

			} else if (resource === 'event') {

				// ----------------------------------
				//       group: getAll
				// ----------------------------------

				if (operation === 'getAll') {

					const endpoint = '/public/events';
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				}

			// *********************************************************************
			// 															group
			// *********************************************************************

			} else if (resource === 'group') {

				// ----------------------------------
				//       group: create
				// ----------------------------------

				if (operation === 'create') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       group: delete
				// ----------------------------------

				} else if (operation === 'delete') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'DELETE', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//        group: get
				// ----------------------------------

				} else if (operation === 'get') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       group: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = '/public/groups';
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       group: getMembers
				// ----------------------------------

				} else if (operation === 'getMembers') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}/member-ids`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       group: update
				// ----------------------------------

				} else if (operation === 'update') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}/member-ids`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       group: getMembers
				// ----------------------------------

				} else if (operation === 'updateMembers') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {}, accessToken);

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
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       member: delete
				// ----------------------------------

				} else if (operation === 'delete') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'DELETE', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//        member: get
				// ----------------------------------

				} else if (operation === 'get') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       member: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = '/public/members';
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       member: getGroups
				// ----------------------------------

				} else if (operation === 'getGroups') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}/group-ids`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       member: reinvite
				// ----------------------------------

				} else if (operation === 'reinvite') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}/reinvite`;
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       member: updateGroups
				// ----------------------------------

				} else if (operation === 'updateGroups') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}/group-ids`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       member: update
				// ----------------------------------

				} else if (operation === 'update') {

					const id = this.getNodeParameter('memberId', i);
					const endpoint = `/public/members/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {}, accessToken);

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
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, {}, accessToken);

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
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//       policy: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = '/public/policies';
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, accessToken);

				// ----------------------------------
				//        policy: update
				// ----------------------------------

				} else if (operation === 'update') {

					const id = this.getNodeParameter('policyId', i);
					const endpoint = `/public/policies/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {}, accessToken);

				}

			}

			if (operation === 'getAll') {
				responseData = responseData.data;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

			}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
