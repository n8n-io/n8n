import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	bitwardenApiRequest,
} from './GenericFunctions';

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
				name: 'bitwardenOAuth2Api',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

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
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       collection: update
				// ----------------------------------

				} else if (operation === 'update') {

					const id = this.getNodeParameter('collectionId', i);
					const endpoint = `/public/collections/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {});

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
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

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
					responseData = await bitwardenApiRequest.call(this, 'POST', endpoint, {}, {});

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
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       group: getMembers
				// ----------------------------------

				} else if (operation === 'getMembers') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}/member-ids`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       group: update
				// ----------------------------------

				} else if (operation === 'update') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}/member-ids`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {});

				// ----------------------------------
				//       group: getMembers
				// ----------------------------------

				} else if (operation === 'updateMembers') {

					const id = this.getNodeParameter('groupId', i);
					const endpoint = `/public/groups/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'PUT', endpoint, {}, {});

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

				} else if (operation === 'getGroups') {

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
				//       member: get
				// ----------------------------------

				if (operation === 'get') {

					const id = this.getNodeParameter('policyId', i);
					const endpoint = `/public/policies/${id}`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//       member: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = `/public/policies`;
					responseData = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//        member: update
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
