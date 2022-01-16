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

] as INodeProperties[];