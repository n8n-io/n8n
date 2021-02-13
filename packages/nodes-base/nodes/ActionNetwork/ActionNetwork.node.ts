import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { createPersonSignupHelperFields, createFilterFields } from './UserInterface';
import { actionNetworkApiRequestREST, constructODIFilterString, constructPersonSignupHelperPayload } from './GenericFunctions';

export class ActionNetwork implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Action Network',
		name: 'actionNetwork',
		icon: 'file:actionnetwork.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["method"] + ": " + $parameter["resource"]}}',
		description: 'Interact with an Action Network group\'s data',
		defaults: {
			name: 'Action Network',
			color: '#9dd3ed',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ActionNetworkGroupApiToken',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'API Version',
				name: 'version',
				type: 'options',
				options: [{ name: 'Version 2', value: 'v2', },],
				default: 'v2',
				description: 'API version',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{ name: 'Person', value: 'people', },
					{ name: 'Petition', value: 'petitions' },
					{ name: 'Event', value: 'events' },
					{ name: 'Form', value: 'forms' },
					{ name: 'Fundraising Page', value: 'fundraising_pages' },
					{ name: 'Event Campaign', value: 'event_campaigns' },
					{ name: 'Campaign', value: 'campaigns' },
					{ name: "Message", value: 'messages' }
				],
				default: 'people',
				description: 'The resource to work with.',
			},
			{
				displayName: 'Resource ID',
				name: 'resource_id',
				type: 'string',
				required: false,
				default: '',
				displayOptions: {
					show: {
						resource: ['events', 'petitions', 'forms', 'fundraising_pages', 'campaigns'],
						method: ['POST', 'GET']
					}
				}
			},
			//
			{
				displayName: 'Related Resource',
				name: 'related_resource',
				type: 'options',
				options: [
					{ name: 'N/A', value: '' },
					{ name: 'Attendance', value: 'attendances' },
				],
				required: false,
				default: '',
				description: 'A resource related to its parent resource',
				displayOptions: { show: { resource: ['events'] }, hide: { resource_id: [''] } }
			},
			/**
			 * Signature
			 */
			{
				displayName: 'Related Resource',
				name: 'related_resource',
				type: 'options',
				options: [
					{ name: 'N/A', value: '' },
					{ name: 'Signature', value: 'signatures' },
				],
				required: false,
				default: '',
				description: 'A resource related to its parent resource',
				displayOptions: { show: { resource: ['petitions'] }, hide: { resource_id: [''] } }
			},
			//
			{
				displayName: 'Related Resource',
				name: 'related_resource',
				type: 'options',
				options: [
					{ name: 'N/A', value: '' },
					{ name: 'Submission', value: 'submissions' },
				],
				required: false,
				default: '',
				description: 'A resource related to its parent resource',
				displayOptions: { show: { resource: ['forms'] }, hide: { resource_id: [''] } }
			},
			/**
			 * Donation
			 */
			{
				displayName: 'Related Resource',
				name: 'related_resource',
				type: 'options',
				options: [
					{ name: 'N/A', value: '' },
					{ name: 'Donation', value: 'donations' },
				],
				required: false,
				default: '',
				description: 'A resource related to its parent resource',
				displayOptions: { show: { resource: ['fundraising_pages'] }, hide: { resource_id: [''] } }
			},
			/**
			 * Outreach
			 */
			{
				displayName: 'Related Resource',
				name: 'related_resource',
				type: 'options',
				options: [
					{ name: 'N/A', value: '' },
					{ name: 'Outreach' , value: 'outreaches' },
				],
				required: false,
				default: '',
				description: 'A resource related to its parent resource',
				displayOptions: { show: { resource: ['campaigns'] }, hide: { resource_id: [''] } }
			},
			//
			{
				displayName: 'Related Resource ID',
				name: 'related_resource_id',
				type: 'string',
				required: false,
				default: '',
				displayOptions: {
					show: {
						related_resource: ['signatures', 'attendances', 'submissions', 'donations', 'outreaches'],
						method: ['POST', 'GET']
					},
					hide: {
						resource: ['people'],
						method: ['POST']
					}
				}
			},
			/**
			 * Operations
			 */
			{
				displayName: 'Operations',
				name: 'method',
				type: 'options',
				options: [
					{
						name: 'Retrieve',
						value: 'GET',
						description: 'Retrieve a collection of resources'
					},
					{
						name: 'Create',
						value: 'POST',
						description: 'Create a new resource'
					},
				],
				default: 'GET',
				description: 'The operation to perform on this resource.'
			},
			/**
			 * List resources
			 */
			{
				displayName: 'Include Metadata',
				description: "When disabled, you'll get a list of items",
				name: 'include_metadata',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						method: ['GET']
					}
				}
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				displayOptions: {
					show: {
						method: ['GET']
					}
				}
			},
			{
				displayName: 'Items (max 25)',
				name: 'per_page',
				type: 'number',
				default: 25,
				displayOptions: {
					show: {
						method: ['GET']
					}
				}
			},
			...createFilterFields({
				properties: [ 'identifier', 'created_date', 'modified_date', 'family_name', 'given_name', 'email_address', 'region', 'postal_code', ],
				displayOptions: {
					show: {
						resource: [ 'people', ],
						method: [ 'GET' ]
					}
				}
			}),
			...createFilterFields({
				properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
				displayOptions: {
					show: {
						resource: [ 'petitions', 'events', 'forms', 'fundraising_pages', 'event_campaigns', 'campaigns', 'advocacy_campaigns', ],
						method: [ 'GET' ]
					}
				}
			}),
			...createFilterFields({
				properties: [ 'identifier', 'created_date', 'modified_date' ],
				displayOptions: {
					show: {
						related_resource: [ 'signatures', 'attendances', 'submissions', 'donations', 'outreaches'  ],
						method: [ 'GET' ]
					}
				}
			}),
			/**
			 * People data
			 */
			{
				displayName: 'Unique Person URL',
				description: "E.g. https://actionnetwork.org/api/v2/people/c945d6fe-929e-11e3-a2e9-12313d316c29",
				name: 'osdi:person',
				type: 'string',
				required: false,
				default: '',
				displayOptions: {
					show: {
						related_resource: ['attendances', 'submissions', 'signatures', 'donations', ],
						method: ['POST']
					},
					hide: {
						resource: ['people'],
						method: ['POST']
					}
				}
			},
			...createPersonSignupHelperFields({
				displayOptions: {
					show: {
						related_resource: ['attendances', 'submissions', 'signatures', 'donations'],
						method: [ 'POST' ]
					}
				}
			}),
			...createPersonSignupHelperFields({
				displayOptions: {
					show: {
						resource: ['people'],
						method: [ 'POST' ]
					}
				}
			}),
			/**
			 * Other POST form data
			 */
			{
				displayName: 'Signature Comment',
				name: 'comments',
				type: 'string',
				required: false,
				default: '',
				displayOptions: { show: { related_resource: ['signatures'], method: ['POST'] } }
			},
			{
				displayName: 'Send Autorespond Email',
				name: 'autorespond',
				type: 'boolean',
				required: false,
				default: true,
				displayOptions: {
					show: {
						related_resource: ['attendances', 'submissions', 'signatures'],
						method: ['POST']
					}
				}
			},
			{
				displayName: 'Donation Recipients',
				name: 'recipients',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Donation Recipient',
				displayOptions: { show: { related_resource: ['donations'], method: ['POST'] } },
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'recipients',
						displayName: 'Recipients',
						values: [
							{
								displayName: 'Name',
								name: 'display_name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Amount',
								name: 'amount',
								type: 'number',
								default: 0,
							},
						]
					}
				]
			},
			{
				displayName: 'Outreach Targets',
				name: 'targets',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Donation Recipient',
				displayOptions: { show: { related_resource: ['outreaches'], method: ['POST'] } },
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'targets',
						displayName: 'Targets',
						values: [
							{
								displayName: 'First / Given Name',
								name: 'given_name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Last / Family Name',
								name: 'family_name',
								type: 'string',
								default: '',
							},
						]
					}
				]
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const version = this.getNodeParameter('version', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const method = this.getNodeParameter('method', 0) as string;
		for (let i = 0; i < items.length; i++) {
			let url = `/api/${version}/${resource}`

			// Specify a resource
			const resource_id = this.getNodeParameter('resource_id', i, '') as any
			if (resource_id) {
				url += `/${resource_id}`
			}

			// Specify a related resource
			const related_resource = this.getNodeParameter('related_resource', i, '') as any
			if (resource_id) {
				url += `/${related_resource}`
			} else if (resource === 'messages' && !!resource_id) {
				url += '/send'
			}

			// Specificy a specific related resource
			const related_resource_id = this.getNodeParameter('related_resource_id', i, '') as any
			if (resource_id) {
				url += `/${related_resource_id}`
			}

			if (method === 'POST') {
				let body = {}

				const person_link = this.getNodeParameter('osdi:person', i, '') as any
				if (person_link && ['attendances', 'signatures', 'submissions', 'donations'].includes(related_resource)) {
					body = {
						...body,
						_links: { 'osdi:person': { href: person_link } }
					}
				} else {
					// Docs: https://actionnetwork.org/docs/v2/person_signup_helper
					const additional_fields = this.getNodeParameter('additional_fields', i) as any
					body = {
						...body,
						...constructPersonSignupHelperPayload({
							family_name: this.getNodeParameter('family_name', i),
							given_name: this.getNodeParameter('given_name', i),
							postal_addresses: additional_fields.postal_addresses,
							email_addresses: additional_fields.email_addresses,
							phone_numbers: additional_fields.phone_numbers,
							add_tags: additional_fields.add_tags,
							custom_fields: additional_fields.custom_fields
						})
					}
				}

				if (['attendances', 'signatures', 'submissions'].includes(resource)) {
					// @ts-ignore
					body.triggers = {
						"autoresponse": {
							"enabled": this.getNodeParameter('autorespond', i) as boolean
						}
					}
				}

				if (resource === 'signatures') {
					// @ts-ignore
					body.comments = this.getNodeParameter('comments', i, undefined) as any
				}

				if (resource === 'donations') {
					const { recipients } = this.getNodeParameter('recipients', i, undefined) as any
					if (recipients) {
						// @ts-ignore
						body.recipients = recipients.map(n => ({ ...n, amount: n.amount.toFixed(2) }))
					}
				}

				if (resource === 'outreaches') {
					// @ts-ignore
					const { targets } = this.getNodeParameter('targets', i, undefined) as any
					if (targets) {
						// @ts-ignore
						body.targets = targets.map(n => ({ ...n, amount: n.amount.toFixed(2) }))
					}
				}

				responseData = await actionNetworkApiRequestREST.call(this, method, url, JSON.stringify(body))
			} else if (method === 'GET') {
				// Pagination and item count
				const page = this.getNodeParameter('page', 0) as string;
				const per_page = Math.max(1, Math.min(25, this.getNodeParameter('per_page', 0) as number));
				url += `?page=${page || 1}&per_page=${per_page}`

				// OData filtering
				// Docs: https://actionnetwork.org/docs/v2#odata
				// @ts-ignore
				const { filters } = this.getNodeParameter('filters', 0, []) as IDataObject[] | undefined;
				if (filters) {
					const filter_logic = this.getNodeParameter('filter_logic', 0, 'and') as string;
					url += `&filter=${encodeURIComponent(constructODIFilterString(filters, filter_logic))}`
				}

				responseData = await actionNetworkApiRequestREST.call(this, method, url)

				try {
					// Identify where the list of data is
					const firstDataKey = Object.keys(responseData['_embedded'])[0]

					// Try to identify a dictionary of IDs
					// Particularly useful for pulling out the Action Network ID of an item for a further operation on it
					// e.g. find an event, get its ID and then sign someone up to it via its ID
					for (const i in responseData['_embedded'][firstDataKey] as any[]) {
						responseData['_embedded'][firstDataKey][i].identifierDictionary = responseData['_embedded'][firstDataKey][i].identifiers?.reduce(
							(dict: any, id: string) => {
								try {
									const [prefix, suffix] = id.split(':');
									dict[prefix] = suffix;
								} catch (e) {}
								return dict;
							}, {}
						)
					}

					// And optionally generate data items from the request, if possible
					const include_metadata = this.getNodeParameter('include_metadata', 0) as boolean
					if (!include_metadata) {
						responseData = responseData['_embedded'][firstDataKey]
					}
				} catch (e) {}
			}

			if (responseData === undefined) {
				throw new Error("This operation has not been implemented")
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
