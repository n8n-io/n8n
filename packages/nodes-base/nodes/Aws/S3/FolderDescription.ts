import {
	INodeProperties,
} from 'n8n-workflow';

export const folderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'folder',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a folder',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all folders',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const folderFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                folder:create                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'folder',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Folder Name',
		name: 'folderName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'folder',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'folder',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Parent Folder Key',
				name: 'parentFolderKey',
				type: 'string',
				default: '',
				description: 'Parent folder you want to create the folder in',
			},
			{
				displayName: 'Requester Pays',
				name: 'requesterPays',
				type: 'boolean',
				default: false,
				description: 'Weather the requester will pay for requests and data transfer. While Requester Pays is enabled, anonymous access to this bucket is disabled.',
			},
			{
				displayName: 'Storage Class',
				name: 'storageClass',
				type: 'options',
				options: [
					{
						name: 'Deep Archive',
						value: 'deepArchive',
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
						name: 'Glacier',
						value: 'glacier',
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
				description: 'Amazon S3 storage classes.',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                folder:delete                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'folder',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Folder Key',
		name: 'folderKey',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'folder',
				],
				operation: [
					'delete',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                 folder:getAll                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'folder',
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
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'folder',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'folder',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'folder',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Fetch Owner',
				name: 'fetchOwner',
				type: 'boolean',
				default: false,
				description: 'The owner field is not present in listV2 by default, if you want to return owner field with each key in the result then set the fetch owner field to true.',
			},
			{
				displayName: 'Folder Key',
				name: 'folderKey',
				type: 'string',
				default: '',
			},
		],
	},
];
