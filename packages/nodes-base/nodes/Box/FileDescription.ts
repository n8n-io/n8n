import {
	INodeProperties,
} from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'file',
				],
			},
		},
		options: [
			{
				name: 'Copy',
				value: 'copy',
				description: 'Copy a file',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a file',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search files',
			},
			{
				name: 'Share',
				value: 'share',
				description: 'Share a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file',
			},
		],
		default: 'upload',
		description: 'The operation to perform.',
	},
];

export const fileFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 file:copy                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'copy',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'File ID',
	},
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'copy',
				],
				resource: [
					'file',
				],
			},
		},
		description: 'The ID of folder to copy the file to. If not defined will be copied to the root folder',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'copy',
				],
				resource: [
					'file',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of attributes to include in the response. This can be used to request fields that are not normally returned in a standard response.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'An optional new name for the copied file.',
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
				description: 'An optional ID of the specific file version to copy.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 file:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'Field ID',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 file:download                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'File ID',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'file',
				],
			},
		},
		description: 'Name of the binary property to which to write the data of the read file.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 file:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'Field ID',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'file',
				],
			},
		},
		default: {},
		options: [
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
					'file',
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
					'file',
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
					'file',
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
					'file',
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
				description: `Limits search results to items with the given content types. Content types are defined as a comma separated lists of Box recognized content types.`,
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
				description: `Limits search results to items within the given list of folders. Folders are defined as a comma separated lists of folder IDs.`,
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
				description: `Limits search results to items within a given file size range. File size ranges are defined as comma separated byte sizes.`,
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
				description: `Limits search results to items owned by the given list of owners. Owners are defined as a comma separated list of user IDs.`,
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 file:share                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'The ID of the file to share.',
	},
	{
		displayName: 'Accessible By',
		name: 'accessibleBy',
		type: 'options',
		options: [
			{
				name: 'Group',
				value: 'group',
			},
			{
				name: 'User',
				value: 'user',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'The type of object the file will be shared with.',
	},
	{
		displayName: 'Use Email',
		name: 'useEmail',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'file',
				],
				accessibleBy: [
					'user',
				],
			},
		},
		default: true,
		description: 'Whether identify the user by email or ID.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'file',
				],
				useEmail: [
					true,
				],
				accessibleBy: [
					'user',
				],
			},
		},
		default: '',
		description: `The user's email address to share the file with.`,
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'file',
				],
				useEmail: [
					false,
				],
				accessibleBy: [
					'user',
				],
			},
		},
		default: '',
		description: `The user's ID to share the file with.`,
	},
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'file',
				],
				accessibleBy: [
					'group',
				],
			},
		},
		default: '',
		description: `The group's ID to share the file with.`,
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'options',
		options: [
			{
				name: 'Co-Owner',
				value: 'coOwner',
				description: 'A Co-owner has all of functional read/write access that an editor does',
			},
			{
				name: 'Editor',
				value: 'editor',
				description: 'An editor has full read/write access to a folder or file',
			},
			{
				name: 'Previewer',
				value: 'previewer',
				description: 'A previewer has limited read access',
			},
			{
				name: 'Previewer Uploader',
				value: 'previewerUploader',
				description: 'This access level is a combination of Previewer and Uploader',
			},
			{
				name: 'Uploader',
				value: 'uploader',
				description: 'An uploader has limited write access',
			},
			{
				name: 'Viewer',
				value: 'viewer',
				description: 'A viewer has read access to a folder or file',
			},
			{
				name: 'Viewer Uploader',
				value: 'viewerUploader',
				description: 'This access level is a combination of Viewer and Uploader',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'file',
				],
			},
		},
		default: 'editor',
		description: 'The level of access granted.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'file',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Can View Path',
				name: 'can_view_path',
				type: 'boolean',
				default: false,
				description: `Whether the invited users can see the entire parent path to the associated folder. The user will not gain privileges in any parent folder and therefore cannot see content the user is not collaborated on.`,
			},
			{
				displayName: 'Expires At',
				name: 'expires_at',
				type: 'dateTime',
				default: '',
				description: 'Set the expiration date for the collaboration. At this date, the collaboration will be automatically removed from the item.',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of attributes to include in the response. This can be used to request fields that are not normally returned in a standard response.',
			},
			{
				displayName: 'Notify',
				name: 'notify',
				type: 'boolean',
				default: false,
				description: 'Whether if users should receive email notification for the action performed.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 file:upload                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		placeholder: 'photo.png',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'The name the file should be saved as.',
	},
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		default: false,
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		description: 'If the data to upload should be taken from binary field.',
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				binaryData: [
					false,
				],
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},

		},
		description: 'The text content of the file.',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				binaryData: [
					true,
				],
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},

		},
		description: 'Name of the binary property which contains the data for the file.',
	},
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'ID of the parent folder that will contain the file. If not it will be uploaded to the root folder',
	},
];
