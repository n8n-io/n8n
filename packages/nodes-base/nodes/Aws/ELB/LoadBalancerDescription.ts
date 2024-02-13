import type { INodeProperties } from 'n8n-workflow';

export const loadBalancerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a load balancer',
				action: 'Create a load balancer',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a load balancer',
				action: 'Delete a load balancer',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a load balancer',
				action: 'Get a load balancer',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many load balancers',
				action: 'Get many load balancers',
			},
		],
		default: 'create',
	},
];

export const loadBalancerFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  loadBalancer:create                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'IP Address Type',
		name: 'ipAddressType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Ipv4',
				value: 'ipv4',
			},
			{
				name: 'Dualstack',
				value: 'dualstack',
			},
		],
		default: 'ipv4',
		description: 'The type of IP addresses used by the subnets for your load balancer',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
				operation: ['create'],
			},
		},
		default: '',
		description:
			'This name must be unique per region per account, can have a maximum of 32 characters',
	},
	{
		displayName: 'Schema',
		name: 'schema',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Internal',
				value: 'internal',
			},
			{
				name: 'Internet Facing',
				value: 'internet-facing',
			},
		],
		default: 'internet-facing',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Application',
				value: 'application',
			},
			{
				name: 'Network',
				value: 'network',
			},
		],
		default: 'application',
	},
	{
		displayName: 'Subnet ID Names or IDs',
		name: 'subnets',
		type: 'multiOptions',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSubnets',
		},
		required: true,
		default: [],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['loadBalancer'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Security Group IDs',
				name: 'securityGroups',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getSecurityGroups',
				},
				default: [],
			},
			{
				displayName: 'Tags',
				name: 'tagsUi',
				placeholder: 'Add Tag',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'tagValues',
						displayName: 'Tag',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'The key of the tag',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value of the tag',
							},
						],
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  loadBalancer:get                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Load Balancer ARN',
		name: 'loadBalancerId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular loadBalancer',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  loadBalancer:getMany                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
				operation: ['getMany'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		default: 100,
		typeOptions: {
			maxValue: 400,
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				operation: ['getMany'],
				resource: ['loadBalancer'],
				returnAll: [true],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Names',
				name: 'names',
				type: 'string',
				default: '',
				description:
					'The names of the load balancers. Multiples can be defined separated by comma.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  loadBalancer:delete                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Load Balancer ARN',
		name: 'loadBalancerId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['loadBalancer'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'ID of loadBalancer to delete',
	},
];
