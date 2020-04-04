import { INodeProperties } from 'n8n-workflow';

export const listOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
			},
		},
		options: [
			{
				name: 'Custom Fields',
				value: 'customFields',
				description: `Retrieve list's custom fields`,
			},
		],
		default: 'customFields',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const listFields = [

/* -------------------------------------------------------------------------- */
/*                                list:customFields                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
				operation: [
					'customFields',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Space',
		name: 'space',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
				operation: [
					'customFields',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
			loadOptionsDependsOn: [
				'team',
			]
		},
		required: true,
	},
	{
		displayName: 'Folderless List',
		name: 'folderless',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'list',
				],
				operation: [
					'customFields',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Folder',
		name: 'folder',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
				operation: [
					'customFields',
				],
				folderless: [
					false,
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolders',
			loadOptionsDependsOn: [
				'space',
			],
		},
		required: true,
	},
	{
		displayName: 'List',
		name: 'list',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
				operation: [
					'customFields',
				],
				folderless: [
					true,
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolderlessLists',
			loadOptionsDependsOn: [
				'space',
			],
		},
		required: true,
	},
	{
		displayName: 'List',
		name: 'list',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
				operation: [
					'customFields',
				],
				folderless: [
					false,
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'folder',
			]
		},
		required: true,
	},
] as INodeProperties[];
