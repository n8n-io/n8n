import {
	INodeProperties,
 } from 'n8n-workflow';

export const timeEntryTagOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add tag to time entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all time entry tags',
			},
			{
				name: 'Remove',
				value: 'remove',
				description:'Remove tag from time entry',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const timeEntryTagFields = [

/* -------------------------------------------------------------------------- */
/*                                timeEntryTag:getAll                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
				],
				operation: [
					'getAll',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
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
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'How many results to return.',
	},
/* -------------------------------------------------------------------------- */
/*                                timeEntryTag:add                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
				],
				operation: [
					'add',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Time Entry IDs',
		name: 'timeEntryIds',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
				],
				operation: [
					'add',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Tag Names',
		name: 'tagNames',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getTimeEntryTags',
			loadOptionsDependsOn: [
				'teamId',
			],
		},
		default: [],
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
				],
				operation: [
					'add',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeEntryTag:remove                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
				],
				operation: [
					'remove',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Time Entry IDs',
		name: 'timeEntryIds',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
				],
				operation: [
					'remove',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Tag Names',
		name: 'tagNames',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getTimeEntryTags',
			loadOptionsDependsOn: [
				'teamId',
			],
		},
		default: [],
		displayOptions: {
			show: {
				resource: [
					'timeEntryTag',
				],
				operation: [
					'remove',
				],
			},
		},
		required: true,
	},
] as INodeProperties[];
