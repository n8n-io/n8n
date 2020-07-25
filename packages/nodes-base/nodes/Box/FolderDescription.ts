import {
	INodeProperties,
} from 'n8n-workflow';

export const folderOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'folder',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a folder',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search files',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const folderFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 folder:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'folder',
				],
			},
		},
		default: '',
		description: `Folder's name`,
	},
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'folder',
				],
			},
		},
		default: '',
		description: 'ID of the folder you want to create the new folder in. if not defined it will be created on the root folder',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'folder',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Access',
				name: 'access',
				type: 'options',
				options: [
					{
						name: 'Collaborators',
						value: 'collaborators',
						description: 'Only emails from registered email addresses for collaborators will be accepted.',
					},
					{
						name: 'Open',
						value: 'open',
						description: 'It will accept emails from any email addres',
					},
				],
				default: '',
				description: 'ID of the folder you want to create the new folder in',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of attributes to include in the response. This can be used to request fields that are not normally returned in a standard response.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 folder:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'folder',
				],
			},
		},
		default: '',
		description: 'Folder ID',
	},
	{
		displayName: 'Recursive',
		name: 'recursive',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'folder',
				],
			},
		},
		default: false,
		description: 'Delete a folder that is not empty by recursively deleting the folder and all of its content.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 file:search                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'folder',
				],
			},
		},
		default: '',
		description: 'The string to search for. This query is matched against item names, descriptions, text content of files, and various other fields of the different item types.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'folder',
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
				operation: [
					'search',
				],
				resource: [
					'folder',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'folder',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Content Types',
				name: 'contet_types',
				type: 'string',
				default: '',
				description: `Limits search results to items with the given content types.</br>
				Content types are defined as a comma separated lists of Box recognized content types.`,
			},
			{
				displayName: 'Created At Range',
				name: 'createdRangeUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add Range',
				default: {},
				options: [
					{
						displayName: 'Range',
						name: 'createdRangeValuesUi',
						values: [
							{
								displayName: 'From',
								name: 'from',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'To',
								name: 'to',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'ASC',
					},
					{
						name: 'DESC',
						value: 'DESC',
					},
				],
				default: '',
				description: 'Defines the direction in which search results are ordered. Default value is DESC.',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of attributes to include in the response. This can be used to request fields that are not normally returned in a standard response.',
			},
			{
				displayName: 'File Extensions',
				name: 'file_extensions',
				type: 'string',
				default: '',
				placeholder: 'pdf,png,gif',
				description: 'Limits search results to a comma-separated list of file extensions.',
			},
			{
				displayName: 'Folder IDs',
				name: 'ancestor_folder_ids',
				type: 'string',
				default: '',
				description: `Limits search results to items within the given list of folders.</br>
				Folders are defined as a comma separated lists of folder IDs.`,
			},
			{
				displayName: 'Scope',
				name: 'scope',
				type: 'options',
				options: [
					{
						name: 'User Content',
						value: 'user_content',
					},
					{
						name: 'Enterprise Content',
						value: 'enterprise_content',
					},
				],
				default: '',
				description: 'Limits search results to a user scope.',
			},
			{
				displayName: 'Size Range',
				name: 'size_range',
				type: 'string',
				default: '',
				placeholder: '1000000,5000000',
				description: `Limits search results to items within a given file size range.</br>
				File size ranges are defined as comma separated byte sizes.`,
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{
						name: 'Relevance',
						value: 'relevance',
					},
					{
						name: 'Modified At',
						value: 'modified_at',
					},
				],
				default: 'relevance',
				description: 'returns the results ordered in descending order by date at which the item was last modified.',
			},
			{
				displayName: 'Trash Content',
				name: 'trash_content',
				type: 'options',
				options: [
					{
						name: 'Non Trashed Only',
						value: 'non_trashed_only',
					},
					{
						name: 'Trashed Only',
						value: 'trashed_only',
					},
				],
				default: 'non_trashed_only',
				description: 'Controls if search results include the trash.',
			},
			{
				displayName: 'Update At Range',
				name: 'updatedRangeUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add Range',
				default: {},
				options: [
					{
						displayName: 'Range',
						name: 'updatedRangeValuesUi',
						values: [
							{
								displayName: 'From',
								name: 'from',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'To',
								name: 'to',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'User IDs',
				name: 'owner_user_ids',
				type: 'string',
				default: '',
				description: `Limits search results to items owned by the given list of owners..</br>
				Owners are defined as a comma separated list of user IDs.`,
			},
		],
	},
] as INodeProperties[];
