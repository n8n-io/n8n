import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getActionInheritedProperties,
} from '../GenericFunctions';

export const messageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const messageFields = [
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
				resource: [
					'message',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Room ID',
		name: 'roomId',
		description: ' The room ID',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getRooms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'create',
				],
				destination: [
					'room',
				],
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
				resource: [
					'message',
				],
				operation: [
					'create',
				],
				destination: [
					'person',
				],
			},
		},
	},
	{
		displayName: 'Person ID',
		name: 'toPersonId',
		description: 'The person ID',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'create',
				],
				specifyPersonBy: [
					'id',
				],
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
				resource: [
					'message',
				],
				operation: [
					'create',
				],
				specifyPersonBy: [
					'email',
				],
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
				resource: [
					'message',
				],
				operation: [
					'create',
				],
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
				resource: [
					'message',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Attachments',
				name: 'attachmentsUi',
				type: 'fixedCollection',
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
												description: '',
											},
											{
												displayName: 'Properties',
												name: 'properties',
												displayOptions: {
													show: {
														type: [
															'inputText',
														],
													},
												},
												type: 'collection',
												placeholder: 'Add Property',
												default: {},
												options: [
													{
														displayName: 'ID',
														name: 'id',
														type: 'string',
														required: true,
														default: '',
														description: 'Unique identifier for the value. Used to identify collected input when the Submit action is performed',
													},
													{
														displayName: 'Is Multiline',
														name: 'isMultiline',
														type: 'boolean',
														default: false,
														description: 'If true, allow multiple lines of input',
													},
													{
														displayName: 'Max Length',
														name: 'maxLength',
														type: 'number',
														default: 0,
														description: 'Hint of maximum length characters to collect (may be ignored by some clients)',
													},
													{
														displayName: 'Placeholder',
														name: 'placeholder',
														type: 'string',
														default: '',
														description: 'Description of the input desired. Displayed when no text has been input',
													},
													{
														displayName: 'Regex',
														name: 'regex',
														type: 'string',
														default: '',
														description: 'Regular expression indicating the required format of this text input',
													},
													{
														displayName: 'Style',
														name: 'style',
														type: 'options',
														options: [
															{
																name: 'Text',
																value: 'text',
															},
															{
																name: 'Tel',
																value: 'tel',
															},
															{
																name: 'URL',
																value: 'url',
															},
															{
																name: 'Email',
																value: 'email',
															},
														],
														default: '',
														description: 'Style hint for text input',
													},
													{
														displayName: 'Value',
														name: 'value',
														type: 'string',
														default: '',
														description: 'The initial value for this field',
													},
												],
											},
											{
												displayName: 'Properties',
												name: 'properties',
												displayOptions: {
													show: {
														type: [
															'textBlock',
														],
													},
												},
												type: 'collection',
												placeholder: 'Add Property',
												default: {},
												options: [
													{
														displayName: 'Text',
														name: 'text',
														type: 'string',
														default: '',
														required: true,
														description: 'Text to display. A subset of markdown is supported (https://aka.ms/ACTextFeatures)',
													},
													{
														displayName: 'Color',
														name: 'color',
														type: 'options',
														options: [
															{
																name: 'Default',
																value: 'default',
															},
															{
																name: 'Dark',
																value: 'dark',
															},
															{
																name: 'Light',
																value: 'light',
															},
															{
																name: 'Accent',
																value: 'accent',
															},
															{
																name: 'Good',
																value: 'good',
															},
															{
																name: 'Warning',
																value: 'warning',
															},
															{
																name: 'Attention',
																value: 'attention',
															},
														],
														default: 'default',
														description: 'Color of the TextBlock element',
													},
													{
														displayName: 'Font Type',
														name: 'fontType',
														type: 'options',
														options: [
															{
																name: 'Default',
																value: 'default',
															},
															{
																name: 'Monospace',
																value: 'monospace',
															},
														],
														default: 'default',
														description: 'Type of font to use for rendering',
													},
													{
														displayName: 'Horizontal Alignment',
														name: 'horizontalAlignment',
														type: 'options',
														options: [
															{
																name: 'Left',
																value: 'left',
															},
															{
																name: 'Center',
																value: 'center',
															},
															{
																name: 'Right',
																value: 'right',
															},
														],
														default: 'left',
														description: 'Controls the horizontal text alignment',
													},
													{
														displayName: 'Is Subtle',
														name: 'isSubtle',
														type: 'boolean',
														default: false,
														description: 'Displays text slightly toned down to appear less prominent',
													},
													{
														displayName: 'Max Lines',
														name: 'maxLines',
														type: 'number',
														default: 1,
														description: 'Specifies the maximum number of lines to display',
													},
													{
														displayName: 'Size',
														name: 'size',
														type: 'options',
														options: [
															{
																name: 'Default',
																value: 'default',
															},
															{
																name: 'Small',
																value: 'small',
															},
															{
																name: 'Medium',
																value: 'medium',
															},
															{
																name: 'Large',
																value: 'large',
															},
															{
																name: 'Extra Large',
																value: 'extraLarge',
															},
														],
														default: 'default',
														description: 'Controls size of text',
													},
													{
														displayName: 'Weight',
														name: 'weight',
														type: 'options',
														options: [
															{
																name: 'Default',
																value: 'default',
															},
															{
																name: 'Lighter',
																value: 'lighter',
															},
															{
																name: 'Bolder',
																value: 'bolder',
															},
														],
														default: 'default',
														description: 'Controls the weight of TextBlock elements',
													},
													{
														displayName: 'Wrap',
														name: 'wrap',
														type: 'boolean',
														default: false,
														description: 'If true, allow text to wrap. Otherwise, text is clipped',
													},
													{
														displayName: 'Height',
														name: 'height',
														type: 'options',
														options: [
															{
																name: 'Auto',
																value: 'auto',
															},
															{
																name: 'Stretch',
																value: 'stretch',
															},
														],
														default: 'auto',
														description: 'Specifies the height of the element',
													},
													{
														displayName: 'Separator',
														name: 'separator',
														type: 'boolean',
														default: false,
														description: 'When true, draw a separating line at the top of the element.',
													},
													{
														displayName: 'Spacing',
														name: 'spacing',
														type: 'options',
														options: [
															{
																name: 'Default',
																value: 'default',
															},
															{
																name: 'None',
																value: 'none',
															},
															{
																name: 'Small',
																value: 'small',
															},
															{
																name: 'Medium',
																value: 'medium',
															},
															{
																name: 'Large',
																value: 'large',
															},
															{
																name: 'Extra Large',
																value: 'extraLarge',
															},
															{
																name: 'Padding',
																value: 'padding',
															},
														],
														default: 'default',
														description: 'Controls the amount of spacing between this element and the preceding element',
													},
													{
														displayName: 'ID',
														name: 'id',
														type: 'string',
														default: '',
														description: 'A unique identifier associated with the item',
													},
													{
														displayName: 'Is Visible',
														name: 'isVisible',
														type: 'boolean',
														default: true,
														description: 'If false, this item will be removed from the visual trees',
													},
												],
											},
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
														name: 'Open URL',
														value: 'openUrl',
													},
													{
														name: 'Submit',
														value: 'submit',
													},
													{
														name: 'Execute',
														value: 'execute',
													},
												],
												default: 'openUrl',
												description: '',
											},
											{
												displayName: 'Properties',
												name: 'properties',
												displayOptions: {
													show: {
														type: [
															'openUrl',
														],
													},
												},
												type: 'collection',
												placeholder: 'Add Property',
												default: {},
												options: [
													{
														displayName: 'URL',
														name: 'url',
														type: 'string',
														default: '',
														description: 'The URL to open',
													},
													...getActionInheritedProperties(),
												],
											},
											{
												displayName: 'Properties',
												name: 'properties',
												displayOptions: {
													show: {
														type: [
															'submit',
														],
													},
												},
												type: 'collection',
												placeholder: 'Add Property',
												default: {},
												options: [
													{
														displayName: 'Data',
														name: 'data',
														type: 'string',
														default: '',
														description: 'Initial data that input fields will be combined with. These are essentially ‘hidden’ properties',
													},
													...getActionInheritedProperties(),
												],
											},
											{
												displayName: 'Properties',
												name: 'properties',
												displayOptions: {
													show: {
														type: [
															'execute',
														],
													},
												},
												type: 'collection',
												placeholder: 'Add Property',
												default: {},
												options: [
													{
														displayName: 'Data',
														name: 'data',
														type: 'string',
														default: '',
														description: 'Initial data that input fields will be combined with. These are essentially ‘hidden’ properties',
													},
													{
														displayName: 'Verb',
														name: 'verb',
														type: 'string',
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
										name: 'Binary Data',
										value: 'binaryData',
									},
								],
								default: 'url',
								description: '',
							},
							{
								displayName: 'Input Field With File',
								name: 'binaryPropertyName',
								type: 'string',
								default: 'data',
								required: true,
								displayOptions: {
									show: {
										fileLocation: [
											'binaryData',
										],
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
										fileLocation: [
											'url',
										],
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
				description: 'The message in markdown format. When used the text parameter is used to provide alternate text for UI clients that do not support rich text',
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
				resource: [
					'message',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// // ----------------------------------------
	// //               message: get
	// // ----------------------------------------
	{
		displayName: 'Message ID',
		name: 'messageId',
		description: 'ID of the message to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             message: getAll
	// ----------------------------------------
	{
		displayName: 'Room ID',
		name: 'roomId',
		description: 'List messages in a room, by ID',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getRooms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'The number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
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
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
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
				description: `List only messages with certain person mentioned. Enter their ID. You can use 'me' as a shorthand for yourself`,
			},
		],
	},

	// // ----------------------------------------
	// //             message: update
	// // ----------------------------------------
	{
		displayName: 'Message ID',
		name: 'messageId',
		description: 'ID of the message to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
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
				resource: [
					'message',
				],
				operation: [
					'update',
				],
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
				resource: [
					'message',
				],
				operation: [
					'update',
				],
				markdown: [
					false,
				],
			},
		},
		description: 'The message, in plain text',
	},
	{
		displayName: 'Markdown',
		name: 'markdownText',
		description: 'The message, in Markdown format. The maximum message length is 7439 bytes',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
				markdown: [
					true,
				],
			},
		},
	},
] as INodeProperties[];
