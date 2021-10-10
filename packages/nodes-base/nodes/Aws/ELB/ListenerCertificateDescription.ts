import {
	INodeProperties,
} from 'n8n-workflow';

export const listenerCertificateOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add the specified SSL server certificate to the certificate list for the specified HTTPS or TLS listener',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all listener certificates',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove the specified certificate from the certificate list for the specified HTTPS or TLS listener',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const listenerCertificateFields = [

	/* -------------------------------------------------------------------------- */
	/*                                listenerCertificate:add                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Load Balancer ARN',
		name: 'loadBalancerId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLoadBalancers',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular loadBalancer',
	},
	{
		displayName: 'Listener ARN',
		name: 'listenerId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getLoadBalancerListeners',
			loadOptionsDependsOn: [
				'loadBalancerId',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular loadBalancer',
	},
	{
		displayName: 'Certificate ARN',
		name: 'certificateId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular loadBalancer',
	},

	/* -------------------------------------------------------------------------- */
	/*                              listenerCertificate:getAll                    */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Load Balancer ARN',
		name: 'loadBalancerId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLoadBalancers',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular loadBalancer',
	},
	{
		displayName: 'Listener ARN',
		name: 'listenerId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getLoadBalancerListeners',
			loadOptionsDependsOn: [
				'loadBalancerId',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular loadBalancer',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
				operation: [
					'getAll',
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
		default: 100,
		typeOptions: {
			maxValue: 400,
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
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

	/* -------------------------------------------------------------------------- */
	/*                                listenerCertificate:remove                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Load Balancer ARN',
		name: 'loadBalancerId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLoadBalancers',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
				operation: [
					'remove',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular loadBalancer',
	},
	{
		displayName: 'Listener ARN',
		name: 'listenerId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getLoadBalancerListeners',
			loadOptionsDependsOn: [
				'loadBalancerId',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
				operation: [
					'remove',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular loadBalancer',
	},
	{
		displayName: 'Certificate ARN',
		name: 'certificateId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'listenerCertificate',
				],
				operation: [
					'remove',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular loadBalancer',
	},

] as INodeProperties[];
