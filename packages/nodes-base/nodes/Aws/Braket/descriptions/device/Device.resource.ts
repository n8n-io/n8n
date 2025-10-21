import type { INodeProperties } from 'n8n-workflow';

export const deviceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['device'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get quantum device details',
				action: 'Get a device',
				routing: {
					request: {
						method: 'GET',
						url: '=/device/{{$parameter["deviceArn"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List quantum devices',
				action: 'Get many devices',
				routing: {
					request: {
						method: 'POST',
						url: '/devices',
					},
				},
			},
		],
		default: 'get',
	},
];

export const deviceFields: INodeProperties[] = [
	{
		displayName: 'Device ARN',
		name: 'deviceArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ARN of the quantum device',
	},
	{
		displayName: 'Device Type',
		name: 'deviceType',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				name: 'QPU (Quantum Processing Unit)',
				value: 'QPU',
			},
			{
				name: 'Simulator',
				value: 'SIMULATOR',
			},
		],
		default: [],
		routing: {
			request: {
				body: {
					deviceTypes: '={{ $value }}',
				},
			},
		},
		description: 'Filter devices by type',
	},
	{
		displayName: 'Provider Name',
		name: 'providerName',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				name: 'Amazon Braket',
				value: 'Amazon Braket',
			},
			{
				name: 'D-Wave',
				value: 'D-Wave',
			},
			{
				name: 'IonQ',
				value: 'IonQ',
			},
			{
				name: 'Rigetti',
				value: 'Rigetti',
			},
		],
		default: 'Amazon Braket',
		routing: {
			request: {
				body: {
					providerNames: '={{ [$value] }}',
				},
			},
		},
		description: 'Filter devices by provider',
	},
	{
		displayName: 'Availability Status',
		name: 'status',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				name: 'Online',
				value: 'ONLINE',
			},
			{
				name: 'Offline',
				value: 'OFFLINE',
			},
			{
				name: 'Retired',
				value: 'RETIRED',
			},
		],
		default: 'ONLINE',
		routing: {
			request: {
				body: {
					statuses: '={{ [$value] }}',
				},
			},
		},
		description: 'Filter devices by availability status',
	},
];
