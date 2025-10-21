import type { INodeProperties } from 'n8n-workflow';

export const configOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['config'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a config',
				action: 'Create a config',
				routing: {
					request: {
						method: 'POST',
						url: '/config',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a config',
				action: 'Delete a config',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/config/{{$parameter["configType"]}}/{{$parameter["configId"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get config details',
				action: 'Get a config',
				routing: {
					request: {
						method: 'GET',
						url: '=/config/{{$parameter["configType"]}}/{{$parameter["configId"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List configs',
				action: 'Get many configs',
				routing: {
					request: {
						method: 'GET',
						url: '/config',
					},
				},
			},
		],
		default: 'create',
	},
];

export const configFields: INodeProperties[] = [
	{
		displayName: 'Config Type',
		name: 'configType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['config'],
				operation: ['get', 'delete'],
			},
		},
		options: [
			{
				name: 'Antenna Downlink',
				value: 'antenna-downlink',
			},
			{
				name: 'Antenna Downlink Demod Decode',
				value: 'antenna-downlink-demod-decode',
			},
			{
				name: 'Antenna Uplink',
				value: 'antenna-uplink',
			},
			{
				name: 'Dataflow Endpoint',
				value: 'dataflow-endpoint',
			},
			{
				name: 'Tracking',
				value: 'tracking',
			},
			{
				name: 'Uplink Echo',
				value: 'uplink-echo',
			},
		],
		default: 'antenna-downlink',
		description: 'The type of config',
	},
	{
		displayName: 'Config ID',
		name: 'configId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['config'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
		description: 'The unique identifier of the config',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['config'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
		description: 'The name of the config',
	},
	{
		displayName: 'Config Data',
		name: 'configData',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['config'],
				operation: ['create'],
			},
		},
		default: '{"antennaDownlinkConfig": {"spectrumConfig": {"bandwidth": {"units": "MHz", "value": 30}, "centerFrequency": {"units": "MHz", "value": 7812}}}}',
		routing: {
			request: {
				body: {
					configData: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'The configuration data',
	},
];
