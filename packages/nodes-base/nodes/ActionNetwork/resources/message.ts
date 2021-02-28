import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createResourceLink, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

export const fields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'GET',
		description: 'Operation to perform',
		options: [
			// DOCS: https://actionnetwork.org/docs/v2/messages
			// https://actionnetwork.org/api/v2/messages/
			// https://actionnetwork.org/api/v2/messages/[message_id]
			{ name: "List all messages", value: "list" },
			{ name: "Get a message", value: "get" },
			{ name: "Create new message", value: "create" },
			{ name: "Modify a message", value: "update" },
			// DOCS: https://actionnetwork.org/docs/v2/send_helper
			// https://actionnetwork.org/api/v2/messages/[message_id]/send
			{ name: "Send a message", value: "send" },
			{ name: "Stop a message mid-send", value: "stop" },
			// DOCS: https://actionnetwork.org/docs/v2/schedule_helper
			// https://actionnetwork.org/api/v2/messages/[message_id]/schedule
			{ name: "Schedule message", value: "schedule" },
			{ name: "Cancel message's scheduling", value: "cancel" },
		],
		displayOptions: {
			show: {
				resource: [ 'message' ],
			},
		},
	},
	{
		displayName: 'Message ID',
		name: 'message_id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: ['get', 'send', 'stop', 'schedule', 'cancel']
			},
		},
	},
	/**
	 * Adding or updating a resource
	 */
	{
		displayName: 'Additional properties',
		name: 'additional_properties',
		type: 'fixedCollection',
		default: '',
		placeholder: 'Add data',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
		options: [
			{
				name: 'identifiers',
				displayName: 'Custom ID',
				type: 'string',
				default: '',
			},
			{
				name: 'targets',
				displayName: 'People Query URLs',
				type: 'string',
				default: '',
			},
		]
	},
  {
    displayName: "Send time (UTC)",
    name: "scheduled_start_date",
    type: "dateTime",
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'schedule' ]
			}
		},
  },
	/**
	 * New and updated messages
	 */
	{
		displayName: "Origin System",
		description: "A human readable string identifying where this message originated. May be used in the user interface for this purpose.",
		name: "origin_system",
		type: "string",
		default: undefined,
		required: true,
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'create', 'update' ]
			}
		},
	},
	{
		name: "name",
		displayName: "Name in Action Network",
		type: "string",
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'create', 'update' ]
			}
		},
	},
	{
		displayName: "Email Subject Line",
		name: "subject",
		type: "string",
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'create', 'update' ]
			}
		},
	},
	{
		displayName: "From email address",
		name: "from",
		placeholder: "campaigns@actionnetwork.org",
		type: "string",
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'create', 'update' ]
			}
		},
	},
	{
		displayName: "Reply_to email address",
		name: "reply_to",
		placeholder: "campaigns@actionnetwork.org",
		type: "string",
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'create', 'update' ]
			}
		},
	},
	{
		displayName: "Email message body",
		name: "body",
		description: "The message's body content. May contain HTML. ",
		placeholder: "campaigns@actionnetwork.org",
		type: "string",
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'create', 'update' ]
			}
		},
	},
	{
		name: "osdi:wrapper",
		displayName: "URL for HTML wrapper",
		type: "string",
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'create', 'update' ]
			}
		}
	},
	/**
	 * Listing and getting resources
	 */
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'message' ],
				operation: [ 'list' ],
			}
		}
	}),
];

export const logic = async (node: IExecuteFunctions) => {
	const operation = node.getNodeParameter('operation', 0) as 'list'| 'get'| 'create'| 'update'| 'send'| 'stop'| 'schedule'| 'cancel';

	let url = `/api/v2/messages`

	if (operation === 'list') {
    const qs = createPaginationProperties(node)
    return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	if (operation === 'create') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'targets': (node.getNodeParameter('additional_properties', 0, { targets: [] }) as any)?.targets?.map(url => ({ url })),
			origin_system: node.getNodeParameter('origin_system', 0, undefined) as string,
			name: node.getNodeParameter('name', 0, undefined) as string,
			subject: node.getNodeParameter('subject', 0, undefined) as string,
			from: node.getNodeParameter('from', 0, undefined) as string,
			'reply_to': node.getNodeParameter('reply_to', 0, undefined) as string,
			body: node.getNodeParameter('body', 0, undefined) as string,
		}

		const wrapper = node.getNodeParameter('osdi:wrapper', 0, undefined) as string
		if (wrapper) {
			body['_links'] = {
				'osdi:wrapper': {
					href: wrapper
				}
			}
		}

    return actionNetworkApiRequest.call(node, 'POST', url, body) as Promise<IDataObject[]>
	}

	const message_id = node.getNodeParameter('message_id', 0) as string;

	if (message_id && operation === 'get') {
    url += `/${message_id}`
		return actionNetworkApiRequest.call(node, 'GET', url) as Promise<IDataObject>
	}

	if (message_id && operation === 'update') {
    url += `/${message_id}`

		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'targets': (node.getNodeParameter('additional_properties', 0, { targets: [] }) as any)?.targets?.map(url => ({ url })),
			origin_system: node.getNodeParameter('origin_system', 0, undefined) as string,
			name: node.getNodeParameter('name', 0, undefined) as string,
			subject: node.getNodeParameter('subject', 0, undefined) as string,
			from: node.getNodeParameter('from', 0, undefined) as string,
			'reply_to': node.getNodeParameter('reply_to', 0, undefined) as string,
			body: node.getNodeParameter('body', 0, undefined) as string,
		}

		const wrapper = node.getNodeParameter('osdi:wrapper', 0, undefined) as string
		if (wrapper) {
			body['_links'] = {
				'osdi:wrapper': {
					href: wrapper
				}
			}
		}

    return actionNetworkApiRequest.call(node, 'PUT', url, body) as Promise<IDataObject[]>
	}

	if (message_id && operation === 'send') {
    url += `/${message_id}/send/`
    const body = {}
    return actionNetworkApiRequest.call(node, 'POST', url, body) as Promise<IDataObject[]>
	}

	if (message_id && operation === 'stop') {
    url += `/${message_id}/send/`
    const body = {}
    return actionNetworkApiRequest.call(node, 'DELETE', url, body) as Promise<IDataObject[]>
	}

	if (message_id && operation === 'schedule') {
    url += `/${message_id}/schedule/`
    const body = {
      "scheduled_start_date": node.getNodeParameter('scheduled_start_date', 0) as string
    }
    return actionNetworkApiRequest.call(node, 'POST', url, body ) as Promise<IDataObject[]>
	}

	if (message_id && operation === 'cancel') {
    url += `/${message_id}/schedule/`
    const body = {}
    return actionNetworkApiRequest.call(node, 'DELETE', url, body) as Promise<IDataObject[]>
	}

	return []
}
