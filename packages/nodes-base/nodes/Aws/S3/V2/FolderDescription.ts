import type { INodeProperties } from 'n8n-workflow';

export const folderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['folder'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a folder',
				action: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a folder',
				action: 'Delete a folder',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many folders',
				action: 'Get many folders',
			},
		],
		default: 'create',
	},
];

export const folderFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                folder:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Folder name',
		name: 'folderName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Parent folder key',
				name: 'parentFolderKey',
				type: 'string',
				default: '',
				description: 'Parent folder you want to create the folder in',
			},
			{
				displayName: 'Requester pays',
				name: 'requesterPays',
				type: 'boolean',
				default: false,
				description:
					'Whether the requester will pay for requests and data transfer. While Requester Pays is enabled, anonymous access to this bucket is disabled.',
			},
			{
				displayName: 'Storage class',
				name: 'storageClass',
				type: 'options',
				options: [
					{
						name: 'Deep archive',
						value: 'deepArchive',
					},
					{
						name: 'Glacier',
						value: 'glacier',
					},
					{
						name: 'Intelligent Tiering',
						value: 'intelligentTiering',
					},
					{
						name: 'One Zone IA',
						value: 'onezoneIA',
					},
					{
						name: 'Reduced Redundancy',
						value: 'RecudedRedundancy',
					},
					{
						name: 'Standard',
						value: 'standard',
					},
					{
						name: 'Standard IA',
						value: 'standardIA',
					},
				],
				default: 'standard',
				description: 'Amazon S3 storage classes',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                folder:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Folder key',
		name: 'folderKey',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 folder:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['folder'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['folder'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Fetch owner',
				name: 'fetchOwner',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'The owner field is not present in listV2 by default, if you want to return owner field with each key in the result then set the fetch owner field to true',
			},
			{
				displayName: 'Folder key',
				name: 'folderKey',
				type: 'string',
				default: '',
			},
		],
	},
];
