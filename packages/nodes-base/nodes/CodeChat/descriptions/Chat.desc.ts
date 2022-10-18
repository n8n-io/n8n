import { INodeProperties } from 'n8n-workflow';
import { formatNumber, readMessage, requestURL } from '../Generic.func';

export const onWhatsappProperties: INodeProperties[] = [
	{
		displayName: 'List Recipient Phone Numbers',
		name: 'listPhoneNumbers',
		type: 'json',
		default: [],
		placeholder: `[Array:['5531900000000, '5521911111111']] or 5531922222222`,
		description: 'This field supports both a list and a single number',
		hint: 'Check if the contact is a whatsapp contact. When entering a phone number, make sure to include the country code',
		routing: {
			send: { type: 'body', property: 'numbers', preSend: [formatNumber] },
			request: { url: '=' + requestURL('chat', 'onWhatsApp'), method: 'POST' },
		},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['onWhatsApp'],
			},
		},
	},
];

export const updatePresence: INodeProperties[] = [
	{
		displayName: 'Recipient Phone Numbers',
		name: 'numberProperty',
		required: true,
		type: 'string',
		default: '',
		routing: { send: { type: 'query', property: 'number' } },
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['updatePresence'],
			},
		},
	},

	{
		displayName: 'Precense Type',
		name: 'presenceTypeProperty',
		required: true,
		description: 'Simulate your presence in the chat',
		type: 'options',
		options: [
			{
				name: 'Available',
				value: 'available',
			},
			{
				name: 'Composing',
				value: 'composing',
			},
			{
				name: 'Paused',
				value: 'paused',
			},
			{
				name: 'Recording',
				value: 'recording',
			},
			{
				name: 'Unavailable',
				value: 'unavailable',
			},
		],
		default: 'available',
		routing: { send: { type: 'body', property: 'presence' } },
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['updatePresence'],
			},
		},
	},

	{
		displayName: 'Delay',
		name: 'delayProperty',
		required: true,
		type: 'number',
		default: 1200,
		routing: { send: { type: 'body', property: 'delay' } },
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['updatePresence'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		routing: { request: { url: '=' + requestURL('chat', 'updatePresence'), method: 'PUT' } },
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['updatePresence'],
			},
		},
	},
];

export const markMSGReadProperties: INodeProperties[] = [
	{
		displayName: 'Mark Message as Read',
		name: 'readMessagesProperty',
		required: true,
		type: 'json',
		default: [],
		placeholder: `[Array:[messageId:'id',wuid:'123@s.whatsapp.net',fromMe:false]]`,
		routing: {
			send: { type: 'body', property: 'readMessage', preSend: [readMessage] },
			request: { url: '=' + requestURL('chat', 'markMessageAsRead'), method: 'PUT' },
		},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['markMessageAsRead'],
			},
		},
	},
];

export const blockCobtactProperties: INodeProperties[] = [
	{
		displayName: 'Phone Number',
		name: 'numberProperty',
		required: true,
		type: 'string',
		default: '',
		routing: { send: { type: 'query', property: 'number' } },
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['blockContact'],
			},
		},
	},

	{
		displayName: 'Action',
		name: 'actionProperty',
		required: true,
		type: 'options',
		options: [
			{ name: 'Block', value: 'block' },
			{ name: 'Unblock', value: 'unblock' },
		],
		default: 'block',
		routing: { send: { type: 'body', property: 'action' } },
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['blockContact'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		routing: { request: { url: '=' + requestURL('chat', 'blockContact'), method: 'PUT' } },
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['blockContact'],
			},
		},
	},
];

export const statusContactPorperties: INodeProperties[] = [
	{
		displayName: 'Recipient Phone Numbers',
		name: 'numberProperty',
		required: true,
		type: 'string',
		default: '',
		routing: {
			send: { type: 'query', property: 'number' },
			request: { url: '=' + requestURL('chat', 'fetchStatusContact'), method: 'GET' },
		},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['contactStatus'],
			},
		},
	},
];

export const updateStatusProperties: INodeProperties[] = [
	{
		displayName: 'Status',
		name: 'StatusProperty',
		required: true,
		type: 'string',
		description: 'Update the status of the logged in number',
		default: '',
		routing: {
			send: { type: 'body', property: 'status' },
			request: { url: '=' + requestURL('chat', 'updateStaus'), method: 'PUT' },
		},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['updateStatus'],
			},
		},
	},
];

export const budinessProfileProperties: INodeProperties[] = [
	{
		displayName: 'Phone Number',
		name: 'numberProperty',
		required: true,
		type: 'string',
		default: '',
		description: 'Retrieve a contact\'s business information',
		placeholder: '5531900000000',
		routing: {
			send: { type: 'query', property: 'number' },
			request: { url: '=' + requestURL('chat', 'fetchBusinessProfile'), method: 'GET' },
		},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['businesProfile'],
			},
		},
	},
];

export const profilePictureProperties: INodeProperties[] = [
	{
		displayName: 'Pnhone Number',
		name: 'numberProperty',
		description: 'Retrieve profile picture URL of some contact',
		required: true,
		type: 'string',
		default: '',
		placeholder: '5531900000000',
		routing: {
			send: { type: 'query', property: 'number' },
			request: { url: '=' + requestURL('chat', 'fetchProfilePictureUrl'), method: 'GET' },
		},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['profilePictureUrl'],
			},
		},
	},
];
