import {
	INodeProperties,
} from 'n8n-workflow';

export const bucketOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'bucket',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a bucket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a bucket',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all buckets',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search within a bucket',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const bucketFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                bucket:create                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'bucket',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'A succinct description of the nature, symptoms, cause, or effect of the bucket.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'bucket',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'ACL',
				name: 'acl',
				type: 'options',
				options: [
					{
						name: 'Authenticated Read',
						value: 'authenticatedRead',
					},
					{
						name: 'Private',
						value: 'Private',
					},
					{
						name: 'Public Read',
						value: 'publicRead',
					},
					{
						name: 'Public Read Write',
						value: 'publicReadWrite',
					},
				],
				default: '',
				description: 'The canned ACL to apply to the bucket.',
			},
			{
				displayName: 'Bucket Object Lock Enabled',
				name: 'bucketObjectLockEnabled',
				type: 'boolean',
				default: false,
				description: 'Specifies whether you want S3 Object Lock to be enabled for the new bucket.',
			},
			{
				displayName: 'Grant Full Control',
				name: 'grantFullControl',
				type: 'boolean',
				default: false,
				description: 'Allows grantee the read, write, read ACP, and write ACP permissions on the bucket.',
			},
			{
				displayName: 'Grant Read',
				name: 'grantRead',
				type: 'boolean',
				default: false,
				description: 'Allows grantee to list the objects in the bucket.',
			},
			{
				displayName: 'Grant Read ACP',
				name: 'grantReadAcp',
				type: 'boolean',
				default: false,
				description: 'Allows grantee to read the bucket ACL.',
			},
			{
				displayName: 'Grant Write',
				name: 'grantWrite',
				type: 'boolean',
				default: false,
				description: 'Allows grantee to create, overwrite, and delete any object in the bucket.',
			},
			{
				displayName: 'Grant Write ACP',
				name: 'grantWriteAcp',
				type: 'boolean',
				default: false,
				description: 'Allows grantee to write the ACL for the applicable bucket.',
			},
			{
				displayName: 'Region',
				name: 'region',
				type: 'string',
				default: '',
				description: 'Region you want to create the bucket in, by default the buckets are created on the region defined on the credentials.',
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                                bucket:delete                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'bucket',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Name of the AWS S3 bucket to delete.',
	},

/* -------------------------------------------------------------------------- */
/*                                 bucket:getAll                              */
/* -------------------------------------------------------------------------- */
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
					'bucket',
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
					'bucket',
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
/* -------------------------------------------------------------------------- */
/*                                 bucket:search                              */
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
					'bucket',
				],
				operation: [
					'search',
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
					'search',
				],
				resource: [
					'bucket',
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
					'search',
				],
				resource: [
					'bucket',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'bucket',
				],
				operation: [
					'search',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Delimiter',
				name: 'delimiter',
				type: 'string',
				default: '',
				description: 'A delimiter is a character you use to group keys.',
			},
			{
				displayName: 'Encoding Type',
				name: 'encodingType',
				type: 'options',
				options: [
					{
						name: 'URL',
						value: 'url',
					},
				],
				default: '',
				description: 'Encoding type used by Amazon S3 to encode object keys in the response.',
			},
			{
				displayName: 'Fetch Owner',
				name: 'fetchOwner',
				type: 'boolean',
				default: false,
				description: 'The owner field is not present in listV2 by default, if you want to return owner field with each key in the result then set the fetch owner field to true.',
			},
			{
				displayName: 'Prefix',
				name: 'prefix',
				type: 'string',
				default: '',
				description: 'Limits the response to keys that begin with the specified prefix.',
			},
			{
				displayName: 'Requester Pays',
				name: 'requesterPays',
				type: 'boolean',
				default: false,
				description: 'Weather the requester will pay for requests and data transfer. While Requester Pays is enabled, anonymous access to this bucket is disabled.',
			},
			{
				displayName: 'Start After',
				name: 'startAfter',
				type: 'string',
				default: '',
				description: 'StartAfter is where you want Amazon S3 to start listing from. Amazon S3 starts listing after this specified key',
			},
		],
	},
];
