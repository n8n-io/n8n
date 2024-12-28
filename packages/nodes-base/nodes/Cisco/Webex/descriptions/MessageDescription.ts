import type { INodeProperties } from 'n8n-workflow';

import {
	getActionInheritedProperties,
	getInputTextProperties,
	getTextBlockProperties,
} from '../GenericFunctions';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a message',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a message',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a message',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many messages',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a message',
			},
		],
		default: 'create',
	},
];

export const messageFields: INodeProperties[] = [
	// ----------------------------------------
	//             message: create
	// ----------------------------------------
	{
		displayName: 'Destination',
		name: 'destination',
		type: 'options',
		options: [
			{
				name: 'Room',
				value: 'room',
			},
			{
				name: 'Person',
				value: 'person',
			},
		],
		required: true,
		default: 'room',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Room Name or ID',
		name: 'roomId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getRooms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create'],
				destination: ['room'],
			},
		},
	},
	{
		displayName: 'Specify Person By',
		name: 'specifyPersonBy',
		type: 'options',
		options: [
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'ID',
				value: 'id',
			},
		],
		required: true,
		default: 'email',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create'],
				destination: ['person'],
			},
		},
	},
	{
		displayName: 'Person ID',
		name: 'toPersonId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create'],
				specifyPersonBy: ['id'],
			},
		},
	},
	{
		displayName: 'Person Email',
		name: 'toPersonEmail',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create'],
				specifyPersonBy: ['email'],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create'],
			},
		},
		description: 'The message, in plain text',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Attachments',
				name: 'attachmentsUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Attachment',
				options: [
					{
						displayName: 'Attachment',
						name: 'attachmentValues',
						values: [
							{
								displayName: 'Elements',
								name: 'elementsUi',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								placeholder: 'Add Element',
								options: [
									{
										displayName: 'Element',
										name: 'elementValues',
										values: [
											{
												displayName: 'Type',
												name: 'type',
												type: 'options',
												options: [
													{
														name: 'Text Block',
														value: 'textBlock',
													},
													{
														name: 'Input Text',
														value: 'inputText',
													},
												],
												default: 'textBlock',
											},
											...getTextBlockProperties(),
											...getInputTextProperties(),
										],
									},
								],
							},
							{
								displayName: 'Actions',
								name: 'actionsUi',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								placeholder: 'Add Action',
								options: [
									{
										displayName: 'Action',
										name: 'actionValues',
										values: [
											{
												displayName: 'Type',
												name: 'type',
												type: 'options',
												options: [
													{
														name: 'Execute',
														value: 'execute',
													},
													{
														name: 'Open URL',
														value: 'openUrl',
													},
													{
														name: 'Submit',
														value: 'submit',
													},
												],
												default: 'openUrl',
											},
											{
												displayName: 'URL',
												name: 'url',
												type: 'string',
												default: '',
												displayOptions: {
													show: {
														type: ['openUrl'],
													},
												},
												description: 'The URL to open',
											},
											{
												displayName: 'Data',
												name: 'data',
												type: 'string',
												displayOptions: {
													show: {
														type: ['submit', 'execute'],
													},
												},
												default: '',
												description:
													'Any extra data to pass along. These are essentially ‘hidden’ properties.',
											},
											{
												displayName: 'Verb',
												name: 'verb',
												type: 'string',
												displayOptions: {
													show: {
														type: ['execute'],
													},
												},
												default: '',
												description: 'The card author-defined verb associated with this action',
											},
											...getActionInheritedProperties(),
										],
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'File',
				name: 'fileUi',
				placeholder: 'Add File',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'fileValue',
						displayName: 'File',
						values: [
							{
								displayName: 'File Location',
								name: 'fileLocation',
								type: 'options',
								options: [
									{
										name: 'URL',
										value: 'url',
									},
									{
										name: 'Binary File',
										value: 'binaryData',
									},
								],
								default: 'url',
							},
							{
								displayName: 'Input Field With File',
								name: 'binaryPropertyName',
								type: 'string',
								default: 'data',
								required: true,
								displayOptions: {
									show: {
										fileLocation: ['binaryData'],
									},
								},
								description: 'The field in the node input containing the binary file data',
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										fileLocation: ['url'],
									},
								},
								description: 'The public URL of the file',
							},
						],
					},
				],
			},
			{
				displayName: 'Markdown',
				name: 'markdown',
				type: 'string',
				default: '',
				description:
					'The message in markdown format. When used the text parameter is used to provide alternate text for UI clients that do not support rich text.',
			},
		],
	},

	// ----------------------------------------
	//             message: delete
	// ----------------------------------------
	{
		displayName: 'Message ID',
		name: 'messageId',
		description: 'ID of the message to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               message: get
	// ----------------------------------------
	{
		displayName: 'Message ID',
		name: 'messageId',
		description: 'ID of the message to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             message: getAll
	// ----------------------------------------
	{
		displayName: 'Room Name or ID',
		name: 'roomId',
		description:
			'List messages in a room, by ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getRooms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Before',
				name: 'before',
				description: 'List messages sent before a date and time',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Before Message',
				name: 'beforeMessage',
				description: 'List messages sent before a message, by ID',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Parent Message ID',
				name: 'parentId',
				description: 'List messages with a parent, by ID',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mentioned Person',
				name: 'mentionedPeople',
				type: 'string',
				default: '',
				description:
					"List only messages with certain person mentioned. Enter their ID. You can use 'me' as a shorthand for yourself",
			},
		],
	},

	// ----------------------------------------
	//             message: update
	// ----------------------------------------
	{
		displayName: 'Message ID',
		name: 'messageId',
		description: 'ID of the message to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Is Markdown',
		name: 'markdown',
		description: 'Whether the message uses markdown',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update'],
				markdown: [false],
			},
		},
		description: 'The message, in plain text',
	},
	{
		displayName: 'Markdown',
		name: 'markdownText',
		description: 'The message, in Markdown format. The maximum message length is 7439 bytes.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update'],
				markdown: [true],
			},
		},
	},
];
