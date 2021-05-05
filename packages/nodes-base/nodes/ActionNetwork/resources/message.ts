import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createResourceLink, createPaginationProperties } from '../helpers/fields';
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
			{ name: "Get", value: "get" },
			{ name: "Get All", value: "list" },
			{ name: "Create", value: "create" },
			{ name: "Update", value: "update" },
			// DOCS: https://actionnetwork.org/docs/v2/send_helper
			// https://actionnetwork.org/api/v2/messages/[message_id]/send
			{ name: "Send", value: "send" },
			{ name: "Stop Send", value: "stop" },
			// DOCS: https://actionnetwork.org/docs/v2/schedule_helper
			// https://actionnetwork.org/api/v2/messages/[message_id]/schedule
			{ name: "Schedule", value: "schedule" },
			{ name: "Cancel Schedule", value: "cancel" },
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
				operation: ['get', 'update', 'send', 'stop', 'schedule', 'cancel']
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
				operation: [ 'create', 'update' ]
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
		required: false,
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
		displayName: "ID or URL for HTML wrapper",
		type: "string",
		default: '',
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

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const operation = node.getNodeParameter('operation', i) as 'list'| 'get'| 'create'| 'update'| 'send'| 'stop'| 'schedule'| 'cancel';

	let url = `/api/v2/messages`

	if (operation === 'list') {
    const qs = createPaginationProperties(node, i)
    return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	if (operation === 'create') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'targets': (node.getNodeParameter('additional_properties', i, { targets: [] }) as any)?.targets?.map(url => ({ url })),
			origin_system: node.getNodeParameter('origin_system', i, undefined) as string,
			name: node.getNodeParameter('name', i, undefined) as string,
			subject: node.getNodeParameter('subject', i, undefined) as string,
			from: node.getNodeParameter('from', i, undefined) as string,
			'reply_to': node.getNodeParameter('reply_to', i, undefined) as string,
			body: node.getNodeParameter('body', i, undefined) as string,
		}

		const wrapper = node.getNodeParameter('osdi:wrapper', i, null) as string
		if (wrapper) {
			body = {
				...body,
				...createResourceLink('osdi:wrapper', wrapper, 'https://actionnetwork.org/api/v2/wrappers/')
			}
		}

    return actionNetworkApiRequest.call(node, 'POST', url, body) as Promise<IDataObject[]>
	}

	const message_id = node.getNodeParameter('message_id', i, null) as string;

	if (message_id && operation === 'get') {
    url += `/${message_id}`
		return actionNetworkApiRequest.call(node, 'GET', url) as Promise<IDataObject>
	}

	if (message_id && operation === 'update') {
    url += `/${message_id}`

		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'targets': (node.getNodeParameter('additional_properties', i, { targets: [] }) as any)?.targets?.map(url => ({ url })),
			origin_system: node.getNodeParameter('origin_system', i, undefined) as string,
			name: node.getNodeParameter('name', i, undefined) as string,
			subject: node.getNodeParameter('subject', i, undefined) as string,
			from: node.getNodeParameter('from', i, undefined) as string,
			'reply_to': node.getNodeParameter('reply_to', i, undefined) as string,
			body: node.getNodeParameter('body', i, undefined) as string,
		}

		const wrapper = node.getNodeParameter('osdi:wrapper', i, null) as string
		if (wrapper) {
			body = {
				...body,
				...createResourceLink('osdi:wrapper', wrapper, 'https://actionnetwork.org/api/v2/wrappers/')
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
      "scheduled_start_date": node.getNodeParameter('scheduled_start_date', i) as string
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
