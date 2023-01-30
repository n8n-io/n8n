import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	actionNetworkApiRequest,
	adjustEventPayload,
	adjustPersonPayload,
	adjustPetitionPayload,
	handleListing,
	makeOsdiLink,
	resourceLoaders,
	simplifyResponse,
} from './GenericFunctions';

import {
	attendanceFields,
	attendanceOperations,
	eventFields,
	eventOperations,
	personFields,
	personOperations,
	personTagFields,
	personTagOperations,
	petitionFields,
	petitionOperations,
	signatureFields,
	signatureOperations,
	tagFields,
	tagOperations,
} from './descriptions';

import type {
	AllFieldsUi,
	EmailAddressUi,
	Operation,
	PersonResponse,
	Resource,
	Response,
} from './types';

export class ActionNetwork implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Action Network',
		name: 'actionNetwork',
		icon: 'file:actionNetwork.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Consume the Action Network API',
		defaults: {
			name: 'Action Network',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'actionNetworkApi',
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
						name: 'Attendance',
						value: 'attendance',
					},
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Person',
						value: 'person',
					},
					{
						name: 'Person Tag',
						value: 'personTag',
					},
					{
						name: 'Petition',
						value: 'petition',
					},
					{
						name: 'Signature',
						value: 'signature',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
				],
				default: 'attendance',
			},
			...attendanceOperations,
			...attendanceFields,
			...eventOperations,
			...eventFields,
			...personOperations,
			...personFields,
			...petitionOperations,
			...petitionFields,
			...signatureOperations,
			...signatureFields,
			...tagOperations,
			...tagFields,
			...personTagOperations,
			...personTagFields,
		],
	};

	methods = {
		loadOptions: resourceLoaders,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as Resource;
		const operation = this.getNodeParameter('operation', 0) as Operation;

		let response;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'attendance') {
					// **********************************************************************
					//                               attendance
					// **********************************************************************

					// https://actionnetwork.org/docs/v2/attendances

					if (operation === 'create') {
						// ----------------------------------------
						//            attendance: create
						// ----------------------------------------

						const personId = this.getNodeParameter('personId', i) as string;
						const eventId = this.getNodeParameter('eventId', i);

						const body = makeOsdiLink(personId) as IDataObject;

						const endpoint = `/events/${eventId}/attendances`;
						response = await actionNetworkApiRequest.call(this, 'POST', endpoint, body);
					} else if (operation === 'get') {
						// ----------------------------------------
						//             attendance: get
						// ----------------------------------------

						const eventId = this.getNodeParameter('eventId', i);
						const attendanceId = this.getNodeParameter('attendanceId', i);

						const endpoint = `/events/${eventId}/attendances/${attendanceId}`;
						response = await actionNetworkApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            attendance: getAll
						// ----------------------------------------

						const eventId = this.getNodeParameter('eventId', i);

						const endpoint = `/events/${eventId}/attendances`;
						response = await handleListing.call(this, 'GET', endpoint);
					}
				} else if (resource === 'event') {
					// **********************************************************************
					//                                 event
					// **********************************************************************

					// https://actionnetwork.org/docs/v2/events

					if (operation === 'create') {
						// ----------------------------------------
						//              event: create
						// ----------------------------------------

						const body = {
							origin_system: this.getNodeParameter('originSystem', i),
							title: this.getNodeParameter('title', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as AllFieldsUi;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustEventPayload(additionalFields));
						}

						response = await actionNetworkApiRequest.call(this, 'POST', '/events', body);
					} else if (operation === 'get') {
						// ----------------------------------------
						//                event: get
						// ----------------------------------------

						const eventId = this.getNodeParameter('eventId', i);

						response = await actionNetworkApiRequest.call(this, 'GET', `/events/${eventId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              event: getAll
						// ----------------------------------------

						response = await handleListing.call(this, 'GET', '/events');
					}
				} else if (resource === 'person') {
					// **********************************************************************
					//                                 person
					// **********************************************************************

					// https://actionnetwork.org/docs/v2/people

					if (operation === 'create') {
						// ----------------------------------------
						//              person: create
						// ----------------------------------------

						const emailAddresses = this.getNodeParameter('email_addresses', i) as EmailAddressUi;

						const body = {
							person: {
								email_addresses: [emailAddresses.email_addresses_fields], // only one accepted by API
							},
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length && body.person) {
							Object.assign(body.person, adjustPersonPayload(additionalFields));
						}

						response = await actionNetworkApiRequest.call(this, 'POST', '/people', body);
					} else if (operation === 'get') {
						// ----------------------------------------
						//               person: get
						// ----------------------------------------

						const personId = this.getNodeParameter('personId', i);

						response = (await actionNetworkApiRequest.call(
							this,
							'GET',
							`/people/${personId}`,
						)) as PersonResponse;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              person: getAll
						// ----------------------------------------

						response = (await handleListing.call(this, 'GET', '/people')) as PersonResponse[];
					} else if (operation === 'update') {
						// ----------------------------------------
						//              person: update
						// ----------------------------------------

						const personId = this.getNodeParameter('personId', i);
						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustPersonPayload(updateFields));
						} else {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						response = await actionNetworkApiRequest.call(this, 'PUT', `/people/${personId}`, body);
					}
				} else if (resource === 'petition') {
					// **********************************************************************
					//                                petition
					// **********************************************************************

					// https://actionnetwork.org/docs/v2/petitions

					if (operation === 'create') {
						// ----------------------------------------
						//             petition: create
						// ----------------------------------------

						const body = {
							origin_system: this.getNodeParameter('originSystem', i),
							title: this.getNodeParameter('title', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as AllFieldsUi;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustPetitionPayload(additionalFields));
						}

						response = await actionNetworkApiRequest.call(this, 'POST', '/petitions', body);
					} else if (operation === 'get') {
						// ----------------------------------------
						//              petition: get
						// ----------------------------------------

						const petitionId = this.getNodeParameter('petitionId', i);

						const endpoint = `/petitions/${petitionId}`;
						response = await actionNetworkApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             petition: getAll
						// ----------------------------------------

						response = await handleListing.call(this, 'GET', '/petitions');
					} else if (operation === 'update') {
						// ----------------------------------------
						//             petition: update
						// ----------------------------------------

						const petitionId = this.getNodeParameter('petitionId', i);
						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as AllFieldsUi;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustPetitionPayload(updateFields));
						} else {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						response = await actionNetworkApiRequest.call(
							this,
							'PUT',
							`/petitions/${petitionId}`,
							body,
						);
					}
				} else if (resource === 'signature') {
					// **********************************************************************
					//                               signature
					// **********************************************************************

					// https://actionnetwork.org/docs/v2/signatures

					if (operation === 'create') {
						// ----------------------------------------
						//            signature: create
						// ----------------------------------------

						const personId = this.getNodeParameter('personId', i) as string;
						const petitionId = this.getNodeParameter('petitionId', i);

						const body = makeOsdiLink(personId) as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						const endpoint = `/petitions/${petitionId}/signatures`;
						response = await actionNetworkApiRequest.call(this, 'POST', endpoint, body);
					} else if (operation === 'get') {
						// ----------------------------------------
						//              signature: get
						// ----------------------------------------

						const petitionId = this.getNodeParameter('petitionId', i);
						const signatureId = this.getNodeParameter('signatureId', i);

						const endpoint = `/petitions/${petitionId}/signatures/${signatureId}`;
						response = await actionNetworkApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            signature: getAll
						// ----------------------------------------

						const petitionId = this.getNodeParameter('petitionId', i);

						const endpoint = `/petitions/${petitionId}/signatures`;
						response = await handleListing.call(this, 'GET', endpoint);
					} else if (operation === 'update') {
						// ----------------------------------------
						//            signature: update
						// ----------------------------------------

						const petitionId = this.getNodeParameter('petitionId', i);
						const signatureId = this.getNodeParameter('signatureId', i);
						const body = {};
						const updateFields = this.getNodeParameter('updateFields', i) as AllFieldsUi;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						const endpoint = `/petitions/${petitionId}/signatures/${signatureId}`;
						response = await actionNetworkApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'tag') {
					// **********************************************************************
					//                                  tag
					// **********************************************************************

					// https://actionnetwork.org/docs/v2/tags

					if (operation === 'create') {
						// ----------------------------------------
						//               tag: create
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						response = await actionNetworkApiRequest.call(this, 'POST', '/tags', body);
					} else if (operation === 'get') {
						// ----------------------------------------
						//                 tag: get
						// ----------------------------------------

						const tagId = this.getNodeParameter('tagId', i);

						response = await actionNetworkApiRequest.call(this, 'GET', `/tags/${tagId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               tag: getAll
						// ----------------------------------------

						response = await handleListing.call(this, 'GET', '/tags');
					}
				} else if (resource === 'personTag') {
					// **********************************************************************
					//                                personTag
					// **********************************************************************

					// https://actionnetwork.org/docs/v2/taggings

					if (operation === 'add') {
						// ----------------------------------------
						//             personTag: add
						// ----------------------------------------

						const personId = this.getNodeParameter('personId', i) as string;
						const tagId = this.getNodeParameter('tagId', i);

						const body = makeOsdiLink(personId) as IDataObject;

						const endpoint = `/tags/${tagId}/taggings`;
						response = await actionNetworkApiRequest.call(this, 'POST', endpoint, body);
					} else if (operation === 'remove') {
						// ----------------------------------------
						//             personTag: remove
						// ----------------------------------------

						const tagId = this.getNodeParameter('tagId', i);
						const taggingId = this.getNodeParameter('taggingId', i);

						const endpoint = `/tags/${tagId}/taggings/${taggingId}`;
						response = await actionNetworkApiRequest.call(this, 'DELETE', endpoint);
					}
				}

				const simplify = this.getNodeParameter('simple', i, false) as boolean;

				if (simplify) {
					response =
						operation === 'getAll'
							? response.map((entry: Response) => simplifyResponse(entry, resource))
							: simplifyResponse(response, resource);
				}

				Array.isArray(response) ? returnData.push(...response) : returnData.push(response);
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
