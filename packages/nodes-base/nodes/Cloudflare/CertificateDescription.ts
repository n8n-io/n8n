import {
	INodeProperties,
} from 'n8n-workflow';

export const certificateOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all certificates',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a certificate',
			},
		],
		default: 'upload',
	},
] as INodeProperties[];

export const certificateFields = [
	/* -------------------------------------------------------------------------- */
	/*                          certificate:upload                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Zone ID',
		name: 'zoneId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getZones',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'upload',
					'getAll',
				],
			},
		},
		default: '',
	},
	// {
	// 	displayName: 'Binary Data',
	// 	name: 'binaryData',
	// 	type: 'boolean',
	// 	default: true,
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'upload',
	// 			],
	// 			resource: [
	// 				'certificate',
	// 			],
	// 		},
	// 	},
	// 	description: 'If the data to upload should be taken from binary field',
	// },
	// {
	// 	displayName: 'Binary Property',
	// 	name: 'binaryProperty',
	// 	type: 'string',
	// 	required: true,
	// 	default: 'data',
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'upload',
	// 			],
	// 			resource: [
	// 				'certificate',
	// 			],
	// 			binaryData: [
	// 				true,
	// 			],
	// 		},
	// 	},
	// 	description: 'Name of the binary property to which to write to',
	// },
	{
		displayName: 'Certificate Content',
		name: 'certificate',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'upload',
				],
			},
		},
		default: '',
		description: `The zone's leaf certificate`,
	},
	{
		displayName: 'Private Key',
		name: 'privateKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'upload',
				],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                          certificate:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'certificate',
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
		default: 25,
		typeOptions: {
			minValue: 5,
			maxValue: 50,
		},
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		description: 'The number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'certificate',
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
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Expired',
						value: 'expired',
					},
					{
						name: 'Deleted',
						value: 'deleted',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
				],
				default: '',
				description: 'Status of the zone\'s custom SSL',
			},
		],
	},
] as INodeProperties[];