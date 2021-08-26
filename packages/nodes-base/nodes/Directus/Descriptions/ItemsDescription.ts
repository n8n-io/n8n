import {
	INodeProperties,
} from 'n8n-workflow';

export const itemsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'items'
				]
			}
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new item.'
			},
			{
				name: 'Create Multiple',
				value: 'createMultiple',
				description: 'Create multiple items.'
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an existing item.'
			},
			{
				name: 'Delete Multiple',
				value: 'deleteMultiple',
				description: 'Delete multiple items.'
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single item by unique identifier.'
			},
			{
				name: 'List',
				value: 'list',
				description: 'List the items.'
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing item.'
			},
			{
				name: 'Update Multiple',
				value: 'updateMultiple',
				description: 'Update multiple items.'
			}
		],
		default: 'list',
		description: 'The operation to perform.'
	}
] as INodeProperties[];

export const itemsFields = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '15',
		default: '',
		description: 'Unique ID of the file object.\n',
		required: true
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '"articles"',
		default: '',
		description: 'Unique name of the parent collection.\n',
		required: true
	},
	{
		displayName: 'Data (JSON)',
		name: 'data',
		type: 'json',
		displayOptions: {
			show: {
				operation: [
					'update'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '{\n	"title": "Hello world!",\n	"body": "This is our first article"\n}',
		default: {},
		description: 'The partial [item object](https://docs.directus.io/reference/api/items/#the-item-object).\n',
		required: true
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '15',
		default: '',
		description: 'Unique ID of the file object.\n',
		required: true
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '"articles"',
		default: '',
		description: 'Unique name of the parent collection.\n',
		required: true
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'createMultiple'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '"articles"',
		default: '',
		description: 'Unique name of the parent collection.\n',
		required: true
	},
	{
		displayName: 'Data (JSON)',
		name: 'data',
		type: 'json',
		displayOptions: {
			show: {
				operation: [
					'createMultiple'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '[\n	{\n		"title": "Hello world!",\n		"body": "This is our first article"\n	},\n	{\n		"title": "Hello again, world!",\n		"body": "This is our second article"\n	}\n]',
		default: {},
		description: 'An array of partial [item objects](https://docs.directus.io/reference/api/items/#the-item-object).\n',
		required: true
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '"articles"',
		default: '',
		description: 'Unique name of the parent collection.\n',
		required: true
	},
	{
		displayName: 'Data (JSON)',
		name: 'data',
		type: 'json',
		displayOptions: {
			show: {
				operation: [
					'create'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '{\n	"title": "Hello world!",\n	"body": "This is our first article"\n}',
		default: {},
		description: 'The partial [item object](https://docs.directus.io/reference/api/items/#the-item-object).\n',
		required: true
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'list'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '"articles"',
		default: '',
		description: 'Unique name of the parent collection.\n',
		required: true
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'list'
				],
				resource: [
					'items'
				]
			}
		},
		options: [
			{
				displayName: 'Deep (JSON)',
				name: 'deep',
				type: 'json',
				placeholder: '',
				default: {},
				description: 'Deep allows you to set any of the other query parameters on a nested relational dataset.\n',
				required: false
			},
			{
				displayName: 'Export',
				name: 'export',
				type: 'options',
				placeholder: 'Select an option',
				default: 'csv',
				description: 'Saves the API response to a file. Accepts one of json, csv, xml.\n',
				required: false,
				options: [
					{
						name: 'CSV',
						value: 'csv',
						description: 'CSV'
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'JSON'
					},
					{
						name: 'XML',
						value: 'xml',
						description: 'XML'
					}
				]
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				placeholder: '',
				default: '',
				description: 'Control what fields are being returned in the object.\n',
				required: false
			},
			{
				displayName: 'Filter (JSON)',
				name: 'filter',
				type: 'json',
				placeholder: '',
				default: {},
				description: 'Select items in collection by given conditions.\n',
				required: false
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				placeholder: '',
				default: 50,
				description: 'A limit on the number of objects that are returned.\n',
				required: false,
				typeOptions: {
					minValue: 1,
					maxValue: 100
				}
			},
			{
				displayName: 'Meta',
				name: 'meta',
				type: 'string',
				placeholder: '',
				default: '',
				description: 'What metadata to return in the response.\n',
				required: false
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				placeholder: '',
				default: 0,
				description: 'How many items to skip when fetching data.\n',
				required: false
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				placeholder: '',
				default: '',
				description: 'Filter by items that contain the given search query in one of their fields.\n',
				required: false
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				placeholder: '',
				default: '',
				description: 'How to sort the returned items. \`sort\` is a CSV of fields used to sort the fetched items. Sorting defaults to ascending (ASC) order but a minus sign (\` - \`) can be used to reverse this to descending (DESC) order. Fields are prioritized by their order in the CSV. You can also use a \` ? \` to sort randomly.\n',
				required: false
			},
			{
				displayName: 'Split Into Items',
				name: 'splitIntoItems',
				type: 'boolean',
				default: false,
				description: 'Outputs each element of an array as own item.',
				required: false,
			}
		]
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '15',
		default: '',
		description: 'Unique ID of the file object.\n',
		required: true
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '"articles"',
		default: '',
		description: 'Unique name of the parent collection.\n',
		required: true
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'deleteMultiple'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '"articles"',
		default: '',
		description: 'Unique name of the parent collection.\n',
		required: true
	},
	{
		displayName: 'Data (JSON)',
		name: 'data',
		type: 'json',
		displayOptions: {
			show: {
				operation: [
					'deleteMultiple'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '[15, 16, 21]',
		default: {},
		description: 'An array of item primary keys.\n',
		required: true
	},
	{
		displayName: 'Data (JSON)',
		name: 'data',
		type: 'json',
		displayOptions: {
			show: {
				operation: [
					'updateMultiple'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '{\n	"keys": [1, 2],\n	"data": {\n		"status": "published"\n	}\n}',
		default: {},
		description: 'An array of partial [item objects](https://docs.directus.io/reference/api/items/#the-item-object).\n',
		required: true
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'updateMultiple'
				],
				resource: [
					'items'
				]
			}
		},
		placeholder: '"articles"',
		default: '',
		description: 'Unique name of the parent collection.\n',
		required: true
	}
] as INodeProperties[];

