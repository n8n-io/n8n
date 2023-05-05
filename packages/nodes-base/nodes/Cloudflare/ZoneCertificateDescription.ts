import type { INodeProperties } from 'n8n-workflow';

export const zoneCertificateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['zoneCertificate'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a certificate',
				action: 'Delete a certificate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a certificate',
				action: 'Get a certificate',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many certificates',
				action: 'Get many certificates',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a certificate',
				action: 'Upload a certificate',
			},
		],
		default: 'upload',
	},
];

export const zoneCertificateFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                          certificate:upload                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Zone Name or ID',
		name: 'zoneId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getZones',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['zoneCertificate'],
				operation: ['upload', 'getMany', 'get', 'delete'],
			},
		},
		default: '',
	},
	{
		displayName: 'Certificate Content',
		name: 'certificate',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['zoneCertificate'],
				operation: ['upload'],
			},
		},
		default: '',
		description: "The zone's leaf certificate",
	},
	{
		displayName: 'Private Key',
		name: 'privateKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['zoneCertificate'],
				operation: ['upload'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                          certificate:getMany                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: {
			show: {
				resource: ['zoneCertificate'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 25,
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		displayOptions: {
			show: {
				resource: ['zoneCertificate'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['zoneCertificate'],
				operation: ['getMany'],
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
				description: "Status of the zone's custom SSL",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                          certificate:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate ID',
		name: 'certificateId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['zoneCertificate'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
	},
];
