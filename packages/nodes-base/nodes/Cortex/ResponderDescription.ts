import {
	INodeProperties,
} from 'n8n-workflow';

export const respondersOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		description:'Choose an operation',
		displayOptions: {
			show: {
				resource: [
					'responder',
				],
			},
		},
		options: [
			{
				name: 'Execute',
				value: 'execute',
				description: 'Execute Responder'
			},
		],
		default: 'execute',
	},

] as INodeProperties[];

export const responderFields:INodeProperties[] = [
	{
		displayName: 'Responder type',
		name: 'responder',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod:'loadActiveResponders',
		},
		default: '',
		displayOptions:{
			show: {
				resource: [
					'responder',
				],
			},
		},
		description: 'choose the responder',
	},
	{
		displayName: 'Data type',
		name: 'dataType',
		type: 'options',
		required: true,
		displayOptions:{
			show: {
				resource: [
					'responder',
				],
			},
			hide: {
				responder: [
					'',
				],
			},
		},
		typeOptions:{
			loadOptionsMethod: 'loadDataTypeOptions',
			loadOptionsDependsOn: [
				'responder',
			],
		},
		default: '',
		description: 'choose the Data type',
	},
	{
		displayName: 'Entity object (JSON)',
		name: 'objectData',
		type: 'json',
		required: true,
		displayOptions:{
			show: {
				resource: [
					'responder',
				],
			},
			hide: {
				responder: [
					'',
				],
			},
		},
		default: '',
		description: 'Entity object data JSON format',
	},
];
