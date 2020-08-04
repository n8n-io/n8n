import {
	INodeProperties,
 } from 'n8n-workflow';

export const timeTrackingOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
			},
		},
		options: [
			{
				name: 'Log',
				value: 'log',
				description: 'Log time on task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a logged time',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all logging times on task',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a logged time',
			},
		],
		default: 'log',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const timeTrackingFields = [

/* -------------------------------------------------------------------------- */
/*                                timeTracking:log                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: '',
		options: [
			{
				name: 'Duration',
				value: 'duration',
			},
			{
				name: 'From/To',
				value: 'fromTo',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
			},
		},
	},
	{
		displayName: 'Minutes',
		name: 'minutes',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
				type: [
					'duration',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'From',
		name: 'from',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
				type: [
					'fromTo',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
				type: [
					'fromTo',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:delete                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Interval ID',
		name: 'interval',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:getAll                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'getAll',
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:update                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Interval ID',
		name: 'interval',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: '',
		options: [
			{
				name: 'Duration',
				value: 'duration',
			},
			{
				name: 'From/To',
				value: 'fromTo',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Minutes',
		name: 'minutes',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
				type: [
					'duration',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'From',
		name: 'from',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
				type: [
					'fromTo',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
				type: [
					'fromTo',
				],
			},
		},
		required: true,
	},
] as INodeProperties[];
