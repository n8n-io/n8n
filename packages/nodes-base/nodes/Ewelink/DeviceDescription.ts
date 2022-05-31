import {
	INodeProperties,
} from 'n8n-workflow';

export const deviceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
				show: {
						resource: [
								'device',
						],
				},
		},
		options: [
				{
					name: 'Get Channel Count',
					value: 'getDeviceChannelCount',
					description: 'Get Device Channel Count',
				},
				{
					name: 'Get Current Humidity',
					value: 'getDeviceCurrentHumidity',
					description: 'Get Device Current Humidity',
				},
				{
					name: 'Get Current Temp & Humidity',
					value: 'getDeviceCurrentTH',
					description: 'Get Device Current Temp & Humidity',
				},
				{
					name: 'Get Current Temperature',
					value: 'getDeviceCurrentTemperature',
					description: 'Get Device Current Temperature',
				},
				{
					name: 'Get Device',
					value: 'getDevice',
					description: 'Get device by ID',
				},
				{
					name: 'Get Devices',
					value: 'getDevices',
					description: 'Get all devices',
				},
				{
					name: 'Get Firmware Version',
					value: 'getFirmwareVersion',
					description: 'Get Device Firmware Version',
				},
				{
					name: 'Get Power State',
					value: 'getDevicePowerState',
					description: 'Get Device Power State',
				},
				{
					name: 'Get Power Usage',
					value: 'getDevicePowerUsage',
					description: 'Get Device Power Usage',
				},
				{
					name: 'Set Power State',
					value: 'setDevicePowerState',
					description: 'Set Device Power State',
				},
				{
					name: 'Toggle State',
					value: 'toggleDevice',
					description: 'Toggle Device Power State',
				},
		],
		default: 'getDevices',
	},
];

export const deviceFields: INodeProperties[] = [
	{
		displayName: 'Device ID',
		name: 'deviceId',
		type: 'string',
		required: true,
		displayOptions: {
				show: {
						operation: [
								'getDevice',
								'getDeviceChannelCount',
								'getDeviceCurrentHumidity',
								'getDeviceCurrentTH',
								'getDeviceCurrentTemperature',
								'getDevicePowerState',
								'getDevicePowerUsage',
								'getFirmwareVersion',
								'toggleDevice',
								'setDevicePowerState',
						],
						resource: [
								'device',
						],
				},
		},
		default:'',
		description:'List and Set device states',
	},
	{
		displayName: 'Device Power State',
		name: 'devicePowerState',
		type: 'boolean',
		required: true,
		displayOptions: {
				show: {
						operation: [
								'setDevicePowerState',
						],
						resource: [
								'device',
						],
				},
		},
		default: false,
		description:'List and Set device states',
	},
];
