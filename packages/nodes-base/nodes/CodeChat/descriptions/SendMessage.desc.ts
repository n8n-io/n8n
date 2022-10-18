import { INodeProperties } from 'n8n-workflow';
import {
	prepareShippingOptions,
	requestURL,
	sendButtonsMessage,
	sendContactMessage,
	sendListMessage,
	sendTemplateMessage,
} from '../Generic.func';

export const optionsProperties: INodeProperties[] = [
	{
		displayName: 'Quote Message',
		name: 'quoted',
		default: '',
		hint: 'Enter the ID of the message you want to quote',
		placeholder: 'messageId',
		type: 'string',
		displayOptions: { show: { resource: ['sendMessage'] } },
		routing: { send: { type: 'body', property: 'options.quoted' } },
	},

	{
		displayName: 'Mention Contact',
		name: 'mentioned',
		default: '',
		hint: 'Insert a list with the contact(s) of the user(s) to be mentioned.',
		description: 'Mentions in both group chats and simple chats',
		placeholder: `[Array:['5531900000000, '5521911111111']]`,
		type: 'json',
		displayOptions: { show: { resource: ['sendMessage'] } },
		routing: { send: { type: 'body', property: 'options.mentioned' } },
	},

	{
		displayName: 'Delay Message',
		name: 'delayMessage',
		default: '',
		description: 'Enter the delay with which each message will be delivered',
		placeholder: '1200 milliseconds',
		type: 'number',
		displayOptions: { show: { resource: ['sendMessage'] } },
		routing: {
			send: { type: 'body', property: 'options.delay', preSend: [prepareShippingOptions] },
		},
	},
];

export const textProperties: INodeProperties[] = [
	{
		displayName: 'Text Message',
		name: 'textProperty',
		required: true,
		default: '',
		description: 'The body of the message (max 4096 characters)',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendText'],
			},
		},
		routing: {
			send: { type: 'body', property: 'textMessage.text' },
			request: { url: '=' + requestURL('message', 'sendText'), method: 'POST' },
		},
	},
];

export const buttonsProperties: INodeProperties[] = [
	{
		displayName: 'Button Title',
		name: 'buttonTitleProperty',
		required: true,
		default: '',
		hint: '',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendButtons'],
			},
		},
		routing: {
			send: { type: 'body', property: 'buttonsMessage.title' },
		},
	},

	{
		displayName: 'Button Description',
		name: 'buttonDescProperty',
		required: true,
		default: '',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendButtons'],
			},
		},
		routing: {
			send: { type: 'body', property: 'buttonsMessage.description' },
		},
	},

	{
		displayName: 'Button Footer Text',
		name: 'buttonFooterProperty',
		default: '',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendButtons'],
			},
		},
		routing: {
			send: { type: 'body', property: 'buttonsMessage.footerText' },
		},
	},

	{
		displayName: 'Button Field Type',
		name: 'buttonFieldTypeProperty',
		required: true,
		noDataExpression: true,
		placeholder: '',
		type: 'options',
		options: [
			{ name: 'Collection', value: 'collection' },
			{ name: 'JSON', value: 'json' },
		],
		default: 'collection',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendButtons'],
			},
		},
	},

	{
		displayName: 'Collection Field',
		name: 'collectionFieldProperty',
		required: true,
		placeholder: 'Add Reply Buttons',
		type: 'fixedCollection',
		default: {},
		typeOptions: { multipleValues: true, maxValue: 3 },
		options: [
			{
				displayName: 'Reply Buttons',
				name: 'replyButtons',
				values: [
					{
						displayName: 'Display Text',
						name: 'displayText',
						type: 'string',
						default: '',
						description: 'Unique text per button',
						required: true,
					},
					{
						displayName: 'Button ID',
						name: 'buttonId',
						type: 'string',
						default: '',
						description: 'Unique ID per button',
						required: true,
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendButtons'],
				buttonFieldTypeProperty: ['collection'],
			},
		},
		routing: { send: { type: 'body', property: 'buttons' } },
	},

	{
		displayName: 'JSON Field',
		name: 'jsonProperty',
		required: true,
		placeholder: `[Array:[{displayText: 'Button Text', buttonId: 'btnId01'}]]`,
		type: 'json',
		default: [],
		description: 'Map a JSON directly to this field',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendButtons'],
				buttonFieldTypeProperty: ['json'],
			},
		},
		routing: { send: { type: 'body', property: 'buttonsMessage.buttons' } },
	},

	{
		displayName: 'Media Message',
		name: 'mediaMessageProperty',
		placeholder: 'Add Media Message',
		type: 'fixedCollection',
		default: {},
		typeOptions: { multipleValues: false },
		description: 'Embed media message to button',
		options: [
			{
				displayName: 'Media Message',
				name: 'embedMediaMessage',
				values: [
					{
						displayName: 'Media Type',
						name: 'mediaType',
						required: true,
						type: 'options',
						options: [
							{ name: 'Image', value: 'image' },
							{ name: 'Document', value: 'document' },
							{ name: 'Video', value: 'video' },
							{ name: 'Sticker', value: 'sticker' },
						],
						default: 'image',
						routing: { send: { type: 'body', property: 'mediaData.type' } },
					},
					{
						displayName: 'Media Source',
						name: 'mediaSource',
						required: true,
						type: 'string',
						default: '',
						placeholder: 'url or base64',
						routing: { send: { type: 'body', property: 'mediaData.source' } },
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendButtons'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendButtons'],
			},
		},
		routing: {
			request: { url: '=' + requestURL('message', 'sendButtons'), method: 'POST' },
			send: { preSend: [sendButtonsMessage] },
		},
	},
];

export const templateProperties: INodeProperties[] = [
	{
		displayName: 'Template Title',
		name: 'templateTitleProperty',
		required: true,
		default: '',
		hint: '',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'templateMessage.title' },
		},
	},

	{
		displayName: 'Template Description',
		name: 'templateDescProperty',
		required: true,
		default: '',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'templateMessage.description' },
		},
	},

	{
		displayName: 'Template Footer Text',
		name: 'templateFooterProperty',
		default: '',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: { type: 'body', property: 'templateMessage.footerText' },
		},
	},

	{
		displayName: 'Template Field Type',
		name: 'templateFieldTypeProperty',
		required: true,
		noDataExpression: true,
		placeholder: '',
		type: 'options',
		options: [
			{ name: 'Collection', value: 'collection' },
			{ name: 'JSON', value: 'json' },
		],
		default: 'collection',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendTemplate'],
			},
		},
	},

	{
		displayName: 'Collection Field',
		name: 'colectionProperty',
		required: true,
		placeholder: 'Add Template Buttons',
		type: 'fixedCollection',
		default: {},
		typeOptions: { multipleValues: true },
		options: [
			{
				displayName: 'Template Buttons',
				name: 'templateButtons',
				values: [
					{
						displayName: 'Button Type',
						name: 'buttonType',
						required: true,
						type: 'options',
						options: [
							{ name: 'Url Button', value: 'urlButton' },
							{ name: 'Call Button', value: 'callButton' },
							{ name: 'Reply Button', value: 'replyButton' },
						],
						default: 'replyButton',
					},
					{
						displayName: 'Display Text',
						name: 'displayText',
						required: true,
						type: 'string',
						default: '',
					},
					{
						displayName: 'Payload',
						name: 'payload',
						required: true,
						type: 'string',
						default: '',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendTemplate'],
				templateFieldTypeProperty: ['collection'],
			},
		},
		routing: { send: { type: 'body', property: 'buttons' } },
	},

	{
		displayName: 'JSON Field',
		name: 'jsonProperty',
		required: true,
		placeholder: `[Array:[{buttonType: 'replyButton', displayText: 'Button Text', payload: 'btnId01'}]]`,
		type: 'json',
		default: [],
		description: 'Map a JSON directly to this field',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendTemplate'],
				templateFieldTypeProperty: ['json'],
			},
		},
		routing: { send: { type: 'body', property: 'templateMessage.buttons' } },
	},

	{
		displayName: 'Media Message',
		name: 'mediaMessageProperty',
		placeholder: 'Add Media Message',
		type: 'fixedCollection',
		default: {},
		typeOptions: { multipleValues: false },
		description: 'Embed media message to button',
		options: [
			{
				displayName: 'Media Message',
				name: 'embedMediaMessage',
				values: [
					{
						displayName: 'Media Type',
						name: 'mediaType',
						required: true,
						type: 'options',
						options: [
							{ name: 'Image', value: 'image' },
							{ name: 'Document', value: 'document' },
							{ name: 'Video', value: 'video' },
							{ name: 'Sticker', value: 'sticker' },
						],
						default: 'image',
						routing: { send: { type: 'body', property: 'mediaData.type' } },
					},
					{
						displayName: 'Media Source',
						name: 'mediaSource',
						required: true,
						type: 'string',
						default: '',
						placeholder: 'url or base64',
						routing: { send: { type: 'body', property: 'mediaData.source' } },
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendTemplate'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			request: { url: '=' + requestURL('message', 'sendTemplate'), method: 'POST' },
			send: { preSend: [sendTemplateMessage] },
		},
	},
];

export const mediaMessageProperties: INodeProperties[] = [
	{
		displayName: 'Media Type',
		name: 'mediaTypeProperty',
		required: true,
		placeholder: '',
		type: 'options',
		options: [
			{ name: 'Image', value: 'image' },
			{ name: 'Document', value: 'document' },
			{ name: 'Video', value: 'video' },
			{ name: 'Sticker', value: 'sticker' },
		],
		default: 'image',
		routing: { send: { type: 'body', property: 'mediaMessage.mediaType' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendMedia'],
			},
		},
	},

	{
		displayName: 'Media URL',
		name: 'mediaUrlProperty',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'https://yourdomain.com/image.png',
		routing: { send: { type: 'body', property: 'mediaMessage.url' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendMedia'],
			},
		},
	},

	{
		displayName: 'Media Caption',
		name: 'mediaCaptionProperty',
		type: 'fixedCollection',
		typeOptions: { multipleValues: false },
		default: {},
		options: [
			{
				displayName: 'Caption',
				name: 'captionProperty',
				values: [
					{
						displayName: 'Caption',
						name: 'caption',
						type: 'string',
						default: '',
						placeholder: 'caption - description - title',
						routing: { send: { type: 'body', property: 'mediaMessage.caption' } },
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendMedia'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendMedia'],
			},
		},
		routing: {
			request: { url: '=' + requestURL('message', 'sendMedia'), method: 'POST' },
		},
	},
];

export const mediaBase64MessgeProperties: INodeProperties[] = [
	{
		displayName: 'File Name',
		name: 'fileNameProperty',
		required: true,
		placeholder: 'table.xlsx',
		hint: 'Para que o tipo de arquivo seja identificado pelo WhatsApp, a extensão deve ser informada pelo WhatsApp.',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'mediaMessage.fileName' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendMediaBase64'],
			},
		},
	},

	{
		displayName: 'Media Type',
		name: 'mediaTypeProperty',
		required: true,
		placeholder: '',
		type: 'options',
		options: [
			{ name: 'Image', value: 'image' },
			{ name: 'Document', value: 'document' },
			{ name: 'Video', value: 'video' },
			{ name: 'Sticker', value: 'sticker' },
		],
		default: 'image',
		routing: { send: { type: 'body', property: 'mediaMessage.mediaType' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendMediaBase64'],
			},
		},
	},

	{
		displayName: 'Base64',
		name: 'base64Property',
		required: true,
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'mediaMessage.base64' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendMediaBase64'],
			},
		},
	},

	{
		displayName: 'Media Caption',
		name: 'mediaCaptionProperty',
		type: 'fixedCollection',
		typeOptions: { multipleValues: false },
		default: {},
		options: [
			{
				displayName: 'Caption',
				name: 'captionProperty',
				values: [
					{
						displayName: 'Caption',
						name: 'caption',
						type: 'string',
						default: '',
						placeholder: 'caption - description - title',
						routing: { send: { type: 'body', property: 'mediaMessage.caption' } },
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendMediaBase64'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendMediaBase64'],
			},
		},
		routing: {
			request: { url: '=' + requestURL('message', 'sendMediaBase64'), method: 'POST' },
		},
	},
];

export const whatsAppAudioProperties: INodeProperties[] = [
	{
		displayName: 'WhatsApp Audio',
		name: 'whatsAppAudioProperty',
		required: true,
		placeholder: 'url or base64',
		default: '',
		type: 'string',
		routing: {
			send: { type: 'body', property: 'whatsappAudio.audio' },
			request: { url: '=' + requestURL('message', 'sendWhatsAppAudio'), method: 'POST' },
		},
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendWhatsAppAudio'],
			},
		},
	},
];

export const locationProperties: INodeProperties[] = [
	{
		displayName: 'Latitude',
		name: 'latitudeProperty',
		required: true,
		default: '',
		type: 'number',
		placeholder: '-20.32568196333534',
		routing: { send: { type: 'body', property: 'locationMessage.latitude' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendLocation'],
			},
		},
	},

	{
		displayName: 'Longitude',
		name: 'longitudeProperty',
		required: true,
		default: '',
		type: 'number',
		placeholder: '-20.32568196333534',
		routing: { send: { type: 'body', property: 'locationMessage.longitude' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendLocation'],
			},
		},
	},

	{
		displayName: 'Name',
		name: 'nameProperty',
		default: '',
		description: 'City name - state of ... - district.',
		type: 'string',
		routing: { send: { type: 'body', property: 'locationMessage.name' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendLocation'],
			},
		},
	},

	{
		displayName: 'Address',
		name: 'addressProperty',
		default: '',
		description: 'Location address - landmark - location name',
		type: 'string',
		routing: { send: { type: 'body', property: 'locationMessage.name' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendLocation'],
			},
		},
	},

	{
		displayName: 'Add Type Buttons',
		name: 'addTypeButtonsProperty',
		description: 'Optional',
		type: 'fixedCollection',
		typeOptions: { multipleValues: false },
		options: [
			{
				displayName: 'Reply Buttons',
				name: 'replyButtonsProperty',
				values: [
					{
						displayName: 'Buttons for Location',
						name: 'buttonsLocation',
						required: true,
						placeholder: `[Array:[{displayText: 'Button Text', buttonId: 'btnId01'}]]`,
						type: 'json',
						default: [],
						description: 'Map a JSON directly to this field',
						hint: 'Maximum of three buttons ',
						routing: { send: { type: 'body', property: 'locationMessage.commonButtons.buttons' } },
					},
				],
			},
		],
		default: {},
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendLocation'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendLocation'],
			},
		},
		routing: {
			request: { url: '=' + requestURL('message', 'sendLocation'), method: 'POST' },
		},
	},
];

export const listProperties: INodeProperties[] = [
	{
		displayName: 'List Title',
		name: 'listTitleProperty',
		required: true,
		default: '',
		type: 'string',
		routing: { send: { type: 'body', property: 'listMessage.title' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendList'],
			},
		},
	},

	{
		displayName: 'Description',
		name: 'listDescriptionProperty',
		required: true,
		default: '',
		type: 'string',
		routing: { send: { type: 'body', property: 'listMessage.description' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendList'],
			},
		},
	},

	{
		displayName: 'Button Text',
		name: 'buttonTextProperty',
		required: true,
		default: '',
		description: 'List clickable button title',
		type: 'string',
		routing: { send: { type: 'body', property: 'listMessage.buttonText' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendList'],
			},
		},
	},

	{
		displayName: 'Footer Text',
		name: 'footerTextProperty',
		default: '',
		description: 'Optional',
		type: 'string',
		routing: { send: { type: 'body', property: 'listMessage.footerText' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendList'],
			},
		},
	},

	{
		displayName: 'List Field Type',
		name: 'listFieldTypeProperty',
		required: true,
		noDataExpression: true,
		placeholder: '',
		type: 'options',
		options: [
			{ name: 'Collection', value: 'collection' },
			{ name: 'JSON', value: 'json' },
		],
		default: 'collection',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendList'],
			},
		},
	},

	{
		displayName: 'List Section Fields',
		name: 'listSectionFieldsProperty',
		placeholder: 'Add Section',
		required: true,
		default: {},
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		options: [
			{
				displayName: 'Sections',
				name: 'sections',
				values: [
					{
						displayName: 'Section Title',
						name: 'title',
						required: true,
						type: 'string',
						default: '',
					},
					{
						displayName: 'Rows',
						name: 'rowsProperty',
						placeholder: 'Add Row',
						required: true,
						default: {},
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						options: [
							{
								displayName: 'Row',
								name: 'rows',
								values: [
									{
										displayName: 'Row Title',
										name: 'title',
										required: true,
										type: 'string',
										default: '',
									},
									{
										displayName: 'Description',
										name: 'description',
										required: true,
										type: 'string',
										default: '',
									},
									{
										displayName: 'Row ID',
										name: 'rowId',
										required: true,
										type: 'string',
										default: '',
										description: 'Os rowIds devem ser únicos',
									},
								],
							},
						],
					},
				],
			},
		],
		routing: {
			send: { type: 'body', property: 'listMessage' },
		},
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendList'],
				listFieldTypeProperty: ['collection'],
			},
		},
	},

	{
		displayName: 'List Section JSON',
		name: 'listSectionJSONProperty',
		required: true,
		description: 'Single elements Array',
		placeholder: `[Array:[title:'Section Title',rows:[{title:'Row Title',description:'Description',rowId:'rowId01'}]]]`,
		type: 'json',
		default: [],
		routing: { send: { type: 'body', property: 'listMessage.sections' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendList'],
				listFieldTypeProperty: ['json'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendList'],
			},
		},
		routing: {
			request: { url: '=' + requestURL('message', 'sendList'), method: 'POST' },
			send: { preSend: [sendListMessage] },
		},
	},
];

export const linkPreviewProperties: INodeProperties[] = [
	{
		displayName: 'Url',
		name: 'urlLinkPreviewProperty',
		required: true,
		placeholder: 'https://github.com/jrCleber',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'linkPreview.url' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendLinkPreview'],
			},
		},
	},

	{
		displayName: 'Text',
		name: 'textLinkPreviewProperty',
		required: true,
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'linkPreview.text' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendLinkPreview'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendLinkPreview'],
			},
		},
		routing: {
			request: { url: '=' + requestURL('message', 'sendLinkPreview'), method: 'POST' },
		},
	},
];

export const contactProperties: INodeProperties[] = [
	{
		displayName: 'Contact Field Type',
		name: 'contactTypeProperty',
		required: true,
		noDataExpression: true,
		placeholder: '',
		type: 'options',
		options: [
			{ name: 'Collection', value: 'collection' },
			{ name: 'JSON', value: 'json' },
		],
		default: 'collection',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendContact'],
			},
		},
	},

	{
		displayName: 'Contact Fields',
		name: 'contactFieldsProperty',
		required: true,
		default: {},
		placeholder: '',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		options: [
			{
				displayName: 'Contacts',
				name: 'contacts',
				values: [
					{
						displayName: 'Contact Name',
						name: 'fullName',
						placeholder: 'name',
						required: true,
						default: '',
						type: 'string',
					},
					{
						displayName: 'Whatsapp Unuque ID',
						name: 'wuid',
						placeholder: '5531900000000',
						required: true,
						default: '',
						type: 'string',
					},
					{
						displayName: 'Phone Number',
						name: 'phoneNumber',
						placeholder: '+55 31 9 0000-0000',
						required: true,
						default: '',
						type: 'string',
					},
				],
			},
		],
		routing: { send: { type: 'body', property: 'contactMessage' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendContact'],
				contactTypeProperty: ['collection'],
			},
		},
	},

	{
		displayName: 'Contact JSON',
		name: 'contactJSONProperty',
		required: true,
		description: 'Single elements Array',
		placeholder: `[Array:[fullName:'Contact name',wuid:'5531900000000',phoneNumber]]`,
		type: 'json',
		default: [],
		routing: { send: { type: 'body', property: 'contactMessage' } },
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendContact'],
				contactTypeProperty: ['json'],
			},
		},
	},

	{
		displayName: 'Set Routing',
		name: 'setRouting',
		type: 'hidden',
		default: '',
		displayOptions: {
			show: {
				resource: ['sendMessage'],
				operation: ['sendContact'],
			},
		},
		routing: {
			request: { url: '=' + requestURL('message', 'sendContact'), method: 'POST' },
			send: { preSend: [sendContactMessage] },
		},
	},
];
