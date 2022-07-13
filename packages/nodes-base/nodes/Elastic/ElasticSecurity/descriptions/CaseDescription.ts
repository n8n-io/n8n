import {
	INodeProperties,
} from 'n8n-workflow';

export const caseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a case',
				action: 'Create a case',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a case',
				action: 'Delete a case',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a case',
				action: 'Get a case',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all cases',
				action: 'Get all cases',
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				description: 'Retrieve a summary of all case activity',
				action: 'Get the status of a case',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a case',
				action: 'Update a case',
			},
		],
		default: 'create',
	},
];

export const caseFields: INodeProperties[] = [
	// ----------------------------------------
	//             case: create
	// ----------------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Connector Name or ID',
		name: 'connectorId',
		description: 'Connectors allow you to send Elastic Security cases into other systems (only ServiceNow, Jira, or IBM Resilient). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getConnectors',
		},
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Connector Type',
		name: 'connectorType',
		type: 'options',
		required: true,
		default: '.jira',
		options: [
			{
				name: 'IBM Resilient',
				value: '.resilient',
			},
			{
				name: 'Jira',
				value: '.jira',
			},
			{
				name: 'ServiceNow ITSM',
				value: '.servicenow',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Issue Type',
		name: 'issueType',
		description: 'Type of the Jira issue to create for this case',
		type: 'string',
		placeholder: 'Task',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.jira',
				],
			},
		},
	},
	{
		displayName: 'Priority',
		name: 'priority',
		description: 'Priority of the Jira issue to create for this case',
		type: 'string',
		placeholder: 'High',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.jira',
				],
			},
		},
	},
	{
		displayName: 'Urgency',
		name: 'urgency',
		description: 'Urgency of the ServiceNow ITSM issue to create for this case',
		type: 'options',
		required: true,
		default: 1,
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
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.servicenow',
				],
			},
		},
	},
	{
		displayName: 'Severity',
		name: 'severity',
		description: 'Severity of the ServiceNow ITSM issue to create for this case',
		type: 'options',
		required: true,
		default: 1,
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
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.servicenow',
				],
			},
		},
	},
	{
		displayName: 'Impact',
		name: 'impact',
		description: 'Impact of the ServiceNow ITSM issue to create for this case',
		type: 'options',
		required: true,
		default: 1,
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
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.servicenow',
				],
			},
		},
	},
	{
		displayName: 'Category',
		name: 'category',
		type: 'string',
		description: 'Category of the ServiceNow ITSM issue to create for this case',
		required: true,
		default: '',
		placeholder: 'Helpdesk',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.servicenow',
				],
			},
		},
	},
	{
		displayName: 'Issue Types',
		name: 'issueTypes',
		description: 'Comma-separated list of numerical types of the IBM Resilient issue to create for this case',
		type: 'string',
		placeholder: '123,456',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.resilient',
				],
			},
		},
	},
	{
		displayName: 'Severity Code',
		name: 'severityCode',
		description: 'Severity code of the IBM Resilient issue to create for this case',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		required: true,
		default: 1,
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.resilient',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				description: 'Valid application owner registered within the Cases Role Based Access Control system',
				default: '',
			},
			{
				displayName: 'Sync Alerts',
				name: 'syncAlerts',
				description: 'Whether to synchronize with alerts',
				type: 'boolean',
				default: false,
			},
		],
	},

	// ----------------------------------------
	//               case: delete
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                case: get
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//               case: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'case',
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
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'case',
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
		default: {},
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'In Progress',
						value: 'in-progress',
					},
					{
						name: 'Closed',
						value: 'closed',
					},
				],
				default: 'open',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sortOptions',
		type: 'fixedCollection',
		placeholder: 'Add Sort Options',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Sort Options',
				name: 'sortOptionsProperties',
				values: [
					{
						displayName: 'Sort Key',
						name: 'sortField',
						type: 'options',
						options: [
							{
								name: 'Created At',
								value: 'createdAt',
							},
							{
								name: 'Updated At',
								value: 'updatedAt',
							},
						],
						default: 'createdAt',
					},
					{
						displayName: 'Sort Order',
						name: 'sortOrder',
						type: 'options',
						options: [
							{
								name: 'Ascending',
								value: 'asc',
							},
							{
								name: 'Descending',
								value: 'desc',
							},
						],
						default: 'asc',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//             case: update
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'open',
				options: [
					{
						name: 'Closed',
						value: 'closed',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'In Progress',
						value: 'in-progress',
					},
				],
			},
			{
				displayName: 'Sync Alerts',
				name: 'syncAlerts',
				description: 'Whether to synchronize with alerts',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
			},
		],
	},
];
