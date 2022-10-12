import { INodeProperties } from 'n8n-workflow';

import { TLP } from './AnalyzerInterface';

export const respondersOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		description: 'Choose an operation',
		displayOptions: {
			show: {
				resource: ['responder'],
			},
		},
		options: [
			{
				name: 'Execute',
				value: 'execute',
				description: 'Execute Responder',
				action: 'Execute a responder',
			},
		],
		default: 'execute',
	},
];

export const responderFields: INodeProperties[] = [
	{
		displayName: 'Responder Type Name or ID',
		name: 'responder',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'loadActiveResponders',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['responder'],
			},
		},
		description:
			'Choose the responder. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Entity Type Name or ID',
		name: 'entityType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['responder'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'loadDataTypeOptions',
			loadOptionsDependsOn: ['responder'],
		},
		default: '',
		description:
			'Choose the Data type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonObject',
		type: 'boolean',
		default: false,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description: 'Choose between providing JSON object or seperated attributes',
		displayOptions: {
			show: {
				resource: ['responder'],
			},
		},
	},
	{
		displayName: 'Entity Object (JSON)',
		name: 'objectData',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [true],
			},
		},
		default: '',
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		placeholder: 'Add Parameter',
		options: [
			{
				displayName: 'Case Attributes',
				name: 'values',
				values: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Description of the case',
					},
					{
						displayName: 'Flag',
						name: 'flag',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description: 'Flag of the case default=false',
					},
					{
						displayName: 'Owner',
						name: 'owner',
						type: 'string',
						default: '',
						description:
							'User who owns the case. This is automatically set to current user when status is set to InProgress.',
					},
					{
						displayName: 'Severity',
						name: 'severity',
						type: 'options',
						default: 2,
						options: [
							{
								name: 'Low',
								value: 1,
							},
							{
								name: 'Medium',
								value: 2,
							},
							{
								name: 'High',
								value: 3,
							},
						],
						description: 'Severity of the case. Default=Medium.',
					},
					{
						displayName: 'Start Date',
						name: 'startDate',
						type: 'dateTime',
						default: '',
						description: 'Date and time of the begin of the case default=now',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: 'tag1,tag2,...',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Title of the case',
					},
					{
						displayName: 'TLP',
						name: 'tlp',
						type: 'options',
						default: 2,
						options: [
							{
								name: 'White',
								value: TLP.white,
							},
							{
								name: 'Green',
								value: TLP.green,
							},
							{
								name: 'Amber',
								value: TLP.amber,
							},
							{
								name: 'Red',
								value: TLP.red,
							},
						],
						description: 'Traffic Light Protocol (TLP). Default=Amber.',
					},
				],
			},
		],
		typeOptions: {
			loadOptionsDependsOn: ['entityType'],
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['case'],
			},
			hide: {
				entityType: ['', 'alert', 'case_artifact', 'case_task', 'case_task_log'],
			},
		},
		default: {},
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		placeholder: 'Add Parameter',
		options: [
			{
				displayName: 'Alert Attributes',
				name: 'values',
				values: [
					{
						displayName: 'Artifacts',
						name: 'artifacts',
						type: 'fixedCollection',
						placeholder: 'Add an artifact',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add an Artifact',
						},
						default: [],
						options: [
							{
								displayName: 'Artifact',
								name: 'artifactValues',
								values: [
									{
										displayName: 'Binary Property',
										name: 'binaryProperty',
										type: 'string',
										displayOptions: {
											show: {
												dataType: ['file'],
											},
										},
										default: 'data',
									},
									{
										displayName: 'Data',
										name: 'data',
										type: 'string',
										displayOptions: {
											hide: {
												dataType: ['file'],
											},
										},
										default: '',
									},
									{
										displayName: 'Data Type',
										name: 'dataType',
										type: 'options',
										default: '',
										options: [
											{
												name: 'Domain',
												value: 'domain',
											},
											{
												name: 'File',
												value: 'file',
											},
											{
												name: 'Filename',
												value: 'filename',
											},
											{
												name: 'Fqdn',
												value: 'fqdn',
											},
											{
												name: 'Hash',
												value: 'hash',
											},
											{
												name: 'IP',
												value: 'ip',
											},
											{
												name: 'Mail',
												value: 'mail',
											},
											{
												name: 'Mail Subject',
												value: 'mail_subject',
											},
											{
												name: 'Other',
												value: 'other',
											},
											{
												name: 'Regexp',
												value: 'regexp',
											},
											{
												name: 'Registry',
												value: 'registry',
											},
											{
												name: 'Uri Path',
												value: 'uri_path',
											},
											{
												name: 'URL',
												value: 'url',
											},
											{
												name: 'User Agent',
												value: 'user-agent',
											},
										],
									},
									{
										displayName: 'Message',
										name: 'message',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Tags',
										name: 'tags',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Date',
						name: 'date',
						type: 'dateTime',
						default: '',
						description: 'Date and time when the alert was raised default=now',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Description of the alert',
					},
					{
						displayName: 'Follow',
						name: 'follow',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Severity',
						name: 'severity',
						type: 'options',
						default: 2,
						options: [
							{
								name: 'Low',
								value: 1,
							},
							{
								name: 'Medium',
								value: 2,
							},
							{
								name: 'High',
								value: 3,
							},
						],
						description: 'Severity of the case. Default=Medium.',
					},
					{
						displayName: 'Source',
						name: 'source',
						type: 'string',
						default: '',
						description: 'Source of the alert',
					},
					{
						displayName: 'SourceRef',
						name: 'sourceRef',
						type: 'string',
						default: '',
						description: 'Source reference of the alert',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						default: 'New',
						options: [
							{
								name: 'New',
								value: 'New',
							},
							{
								name: 'Updated',
								value: 'Updated',
							},
							{
								name: 'Ignored',
								value: 'Ignored',
							},
							{
								name: 'Imported',
								value: 'Imported',
							},
						],
						description: 'Status of the alert. Default=New.',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						placeholder: 'tag1,tag2,...',
						default: '',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Title of the alert',
					},
					{
						displayName: 'TLP',
						name: 'tlp',
						type: 'options',
						default: 2,
						options: [
							{
								name: 'White',
								value: TLP.white,
							},
							{
								name: 'Green',
								value: TLP.green,
							},
							{
								name: 'Amber',
								value: TLP.amber,
							},
							{
								name: 'Red',
								value: TLP.red,
							},
						],
						description: 'Traffic Light Protocol (TLP). Default=Amber.',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: '',
						description: 'Type of the alert',
					},
				],
			},
		],
		typeOptions: {
			loadOptionsDependsOn: ['entityType'],
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['alert'],
			},
			hide: {
				responder: [''],
				entityType: ['', 'case', 'case_artifact', 'case_task', 'case_task_log'],
			},
		},
		default: {},
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		placeholder: 'Add Parameter',
		options: [
			{
				displayName: 'Observable Attributes',
				name: 'values',
				values: [
					{
						displayName: 'Binary Property',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						displayOptions: {
							show: {
								dataType: ['file'],
							},
						},
						description: 'Name of the binary property which contains the attachement data',
					},
					{
						displayName: 'Data',
						name: 'data',
						type: 'string',
						default: '',
						displayOptions: {
							hide: {
								dataType: ['file'],
							},
						},
					},
					{
						displayName: 'DataType',
						name: 'dataType',
						type: 'options',
						default: '',
						options: [
							{
								name: 'Domain',
								value: 'domain',
							},
							{
								name: 'File',
								value: 'file',
							},
							{
								name: 'Filename',
								value: 'filename',
							},
							{
								name: 'Fqdn',
								value: 'fqdn',
							},
							{
								name: 'Hash',
								value: 'hash',
							},
							{
								name: 'IP',
								value: 'ip',
							},
							{
								name: 'Mail',
								value: 'mail',
							},
							{
								name: 'Mail Subject',
								value: 'mail_subject',
							},
							{
								name: 'Other',
								value: 'other',
							},
							{
								name: 'Regexp',
								value: 'regexp',
							},
							{
								name: 'Registry',
								value: 'registry',
							},
							{
								name: 'Uri Path',
								value: 'uri_path',
							},
							{
								name: 'URL',
								value: 'url',
							},
							{
								name: 'User Agent',
								value: 'user-agent',
							},
						],
					},
					{
						displayName: 'IOC',
						name: 'ioc',
						type: 'boolean',
						default: false,
						description: 'Whether the observable is an IOC (Indicator of compromise)',
					},
					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Start Date',
						name: 'startDate',
						type: 'dateTime',
						default: '',
						description: 'Date and time of the begin of the case default=now',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						default: '',
						options: [
							{
								name: 'Ok',
								value: 'Ok',
							},
							{
								name: 'Deleted',
								value: 'Deleted',
							},
						],
						description: 'Status of the observable (Ok or Deleted) default=Ok',
					},
					{
						displayName: 'TLP',
						name: 'tlp',
						type: 'options',
						default: 2,
						options: [
							{
								name: 'White',
								value: TLP.white,
							},
							{
								name: 'Green',
								value: TLP.green,
							},
							{
								name: 'Amber',
								value: TLP.amber,
							},
							{
								name: 'Red',
								value: TLP.red,
							},
						],
						description: 'Traffic Light Protocol (TLP). Default=Amber.',
					},
				],
			},
		],
		typeOptions: {
			loadOptionsDependsOn: ['entityType'],
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['case_artifact'],
			},
			hide: {
				responder: [''],
				entityType: ['', 'case', 'alert', 'case_task', 'case_task_log'],
			},
		},
		default: {},
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		placeholder: 'Add Parameter',
		options: [
			{
				displayName: 'Task Attributes',
				name: 'values',
				values: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Title of the task',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						default: 'Waiting',
						options: [
							{
								name: 'Waiting',
								value: 'Waiting',
							},
							{
								name: 'InProgress',
								value: 'InProgress',
							},
							{
								name: 'Completed',
								value: 'Completed',
							},
							{
								name: 'Cancel',
								value: 'Cancel',
							},
						],
					},
					{
						displayName: 'Flag',
						name: 'flag',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
		typeOptions: {
			loadOptionsDependsOn: ['entityType'],
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['case_task'],
			},
			hide: {
				responder: [''],
				entityType: ['', 'case', 'alert', 'case_artifact', 'case_task_log'],
			},
		},
		default: {},
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		placeholder: 'Add Parameter',
		options: [
			{
				displayName: 'Log Attributes',
				name: 'values',
				values: [
					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Start Date',
						name: 'startDate',
						type: 'dateTime',
						default: '',
						description: 'Date and time of the begin of the case default=now',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						required: true,
						default: '',
						options: [
							{
								name: 'Ok',
								value: 'Ok',
							},
							{
								name: 'Deleted',
								value: 'Deleted',
							},
						],
					},
				],
			},
		],
		typeOptions: {
			loadOptionsDependsOn: ['entityType'],
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['case_task_log'],
			},
			hide: {
				responder: [''],
				entityType: ['', 'case', 'alert', 'case_artifact', 'case_task'],
			},
		},
		default: {},
	},
];
