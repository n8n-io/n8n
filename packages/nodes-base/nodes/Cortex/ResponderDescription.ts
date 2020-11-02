import { INodeProperties } from 'n8n-workflow';
import { TLP } from './AnalyzerInterface';
export const respondersOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		description: 'Choose an operation',
		displayOptions: {
			show: {
				resource: ['responder']
			}
		},
		options: [
			{
				name: 'Execute',
				value: 'execute',
				description: 'Execute Responder'
			}
		],
		default: 'execute'
	}
] as INodeProperties[];

export const responderFields: INodeProperties[] = [
	{
		displayName: 'Responder Type',
		name: 'responder',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'loadActiveResponders'
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['responder']
			}
		},
		description: 'choose the responder'
	},
	{
		displayName: 'Entity Type',
		name: 'entityType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['responder']
			},
			hide: {
				responder: ['']
			}
		},
		typeOptions: {
			loadOptionsMethod: 'loadDataTypeOptions',
			loadOptionsDependsOn: ['responder']
		},
		default: '',
		description: 'choose the Data type'
	},
	{
		displayName: 'JSON object',
		name: 'jsonObject',
		type: 'boolean',
		default: false,
		description: 'Choose between providing JSON object or seperated attributes',
		displayOptions: {
			show: {
				resource: ['responder']
			}
		}
	},
	{
		displayName: 'Entity Object (JSON)',
		name: 'objectData',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [true]
			},
			hide: {
				responder: ['']
			}
		},
		default: ''
	},
	{
		displayName: 'Object Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		required:false,
		options: [
			{
				displayName: 'Case attributes',
				name: 'values',
				values: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'Severity',
						name: 'severity',
						type: 'options',
						required: false,
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
						
					},
					{
						displayName: 'StartDate',
						name: 'startDate',
						type: 'dateTime',
						required: false,
						default: ''
					},
					{
						displayName: 'Owner',
						name: 'owner',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'Flag',
						name: 'flag',
						type: 'boolean',
						required: false,
						default: false
					},
					{
						displayName: 'TLP',
						name: 'tlp',
						type: 'options',
						required: false,
						default:2,
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
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						required: false,
						default: '',
						placeholder:'tag1,tag2,...'
					}
				]
			}
		],
		typeOptions:{
			loadOptionsDependsOn:['entityType']
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['case']
			},
			hide: {
				responder: [''],
				entityType: ['','alert','case_artifact','case_task','case_task_log']
			}
		},
		default: ''
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		required:false,
		options: [
			{
				displayName: 'Alert attributes',
				name: 'values',
				values: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'Severity',
						name: 'severity',
						type: 'options',
						required: false,
						default: 2,
						options:[
							{
								name: 'Low',
								value: 1
							},
							{
								name: 'Medium',
								value: 2
							},
							{
								name: 'High',
								value: 3,
							},
						],
						
					},
					{
						displayName: 'Date',
						name: 'date',
						type: 'dateTime',
						required: false,
						default: ''
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						required: false,
						placeholder:'tag1,tag2,...',
						default: ''
					},
					{
						displayName: 'Tlp',
						name: 'tlp',
						type: 'options',
						required: false,
						default: 2,
						options: [
							{
								name:'White',
								value:TLP.white,
							},
							{
								name:'Green',
								value:TLP.green,
							},
							{
								name:'Amber',
								value:TLP.amber,
							},{
								name:'Red',
								value:TLP.red,
							}
						],
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						required: false,
						default: 'New',
						options:[
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
								value: 'Ignored'
							},
							{
								name: 'Imported',
								value: 'Imported',
							},
						],
						
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'Source',
						name: 'source',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'SourceRef',
						name: 'sourceRef',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'Follow',
						name: 'follow',
						type: 'boolean',
						required: false,
						default: false
					},
					{
						displayName: 'Artifacts',
						name: 'artifacts',
						type: 'fixedCollection',
						placeholder:'Add an artifact',
						required: false,
						typeOptions:{
							multipleValues:true,
							multipleValueButtonText:'Add an artifact'
						},
						default:[],
						options: [
							{
								displayName: 'Artifact',
								name: 'artifactValues',
								values: [
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
												value: 'file'
											},
											{
												name: 'Filename',
												value: 'filename'
											},
											{
												name: 'Fqdn',
												value: 'fqdn'
											},
											{
												name: 'Hash',
												value: 'hash'
											},
											{
												name: 'IP',
												value: 'ip'
											},
											{
												name: 'Mail',
												value: 'mail'
											},
											{
												name: 'Mail_subject',
												value: 'mail_subject'
											},
											{
												name: 'Other',
												value: 'other'
											},
											{
												name: 'Regexp',
												value: 'regexp'
											},
											{
												name: 'Registry',
												value: 'registry'
											},
											{
												name: 'Uri_path',
												value: 'uri_path'
											},
											{
												name: 'URL',
												value: 'url'
											},
											{
												name: 'User-agent',
												value: 'user-agent'
											},
										],
										description: '',
									},
									{
										displayName: 'Data',
										name: 'data',
										type: 'string',
										displayOptions: {
											hide: {
												dataType: [
													'file',
												],
											},
										},
										default: '',
										description: '',
									},
									{
										displayName: 'Binary Property',
										name: 'binaryProperty',
										type: 'string',
										displayOptions: {
											show: {
												dataType: [
													'file',
												],
											},
										},
										default: 'data',
										description: '',
									},
									{
										displayName: 'Message',
										name: 'message',
										type: 'string',
										default: '',
										description: '',
									},
									{
										displayName: 'Tags',
										name: 'tags',
										type: 'string',
										default: '',
										description: '',
									},
								],
							}
						]
					},
				]
			}
		],
		typeOptions:{
			loadOptionsDependsOn:['entityType']
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['alert']
			},
			hide: {
				responder: [''],
				entityType: ['','case','case_artifact','case_task','case_task_log']
			}
		},
		default: ''
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		required:false,
		options: [
			{
				displayName: 'Observable attributes',
				name: 'values',
				values: [
					
					{
						displayName: 'DataType',
						name: 'dataType',
						type: 'options',
						required: false,
						default: '',
						options: [
							{
								name: 'Domain',
								value: 'domain',
							},
							{
								name: 'File',
								value: 'file'
							},
							{
								name: 'Filename',
								value: 'filename'
							},
							{
								name: 'Fqdn',
								value: 'fqdn'
							},
							{
								name: 'Hash',
								value: 'hash'
							},
							{
								name: 'IP',
								value: 'ip'
							},
							{
								name: 'Mail',
								value: 'mail'
							},
							{
								name: 'Mail_subject',
								value: 'mail_subject'
							},
							{
								name: 'Other',
								value: 'other'
							},
							{
								name: 'Regexp',
								value: 'regexp'
							},
							{
								name: 'Registry',
								value: 'registry'
							},
							{
								name: 'Uri_path',
								value: 'uri_path'
							},
							{
								name: 'URL',
								value: 'url'
							},
							{
								name: 'User-agent',
								value: 'user-agent'
							},
						],
					},
					{
						displayName: 'Data',
						name: 'data',
						type: 'string',
						required: false,
						default: '',
						displayOptions:{
							hide:{
								dataType:['file']
							}
						}
					},
					{
						displayName: 'Binary Property',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						required: false,
						displayOptions: {
							show: {
								dataType:['file']	
							},
						},
						description: 'Name of the binary property which contains the attachement data',
					},
					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'StartDate',
						name: 'startDate',
						type: 'dateTime',
						required: false,
						default: ''
					},
					{
						displayName: 'Tlp',
						name: 'tlp',
						type: 'options',
						required: false,
						default: 2,
						options: [
							{
								name:'White',
								value:TLP.white,
							},
							{
								name:'Green',
								value:TLP.green,
							},
							{
								name:'Amber',
								value:TLP.amber,
							},{
								name:'Red',
								value:TLP.red,
							}
						],
					},
					{
						displayName: 'Ioc',
						name: 'ioc',
						type: 'boolean',
						required: false,
						default: false
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						required: false,
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
					}
				]
			}
		],
		typeOptions:{
			loadOptionsDependsOn:['entityType']
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['case_artifact']
			},
			hide: {
				responder: [''],
				entityType: ['','case','alert','case_task','case_task_log']
			}
		},
		default: ''
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		required:false,
		options: [
			{
				displayName: 'Task attributes',
				name: 'values',
				values: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						required: false,
						default: ''
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
						required: false,
						default: false
					}
				]
			}
		],
		typeOptions:{
			loadOptionsDependsOn:['entityType']
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['case_task']
			},
			hide: {
				responder: [''],
				entityType: ['','case','alert','case_artifact','case_task_log']
			}
		},
		default: ''
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		required:false,
		options: [
			{
				displayName: 'Log attributes',
				name: 'values',
				values: [
					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						required: false,
						default: ''
					},
					{
						displayName: 'StartDate',
						name: 'startDate',
						type: 'dateTime',
						required: false,
						default: ''
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						required:true,
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
						
					}
				]
			}
		],
		typeOptions:{
			loadOptionsDependsOn:['entityType']
		},
		displayOptions: {
			show: {
				resource: ['responder'],
				jsonObject: [false],
				entityType: ['case_task_log']
			},
			hide: {
				responder: [''],
				entityType: ['','case','alert','case_artifact','case_task']
			}
		},
		default: ''
	}
];
