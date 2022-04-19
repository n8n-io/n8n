import {
	INodeProperties,
} from 'n8n-workflow';

export const folderOperations: INodeProperties[] = [
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
				name: 'Get',
				value: 'get',
				description: 'Get a folder',
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
			{
				name: 'Share',
				value: 'share',
				description: 'Share a folder',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update folder',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const folderFields: INodeProperties[] = [

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
	/*                                 folder:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'folder',
				],
			},
		},
		default: '',
		description: 'Folder ID',
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
	/*                                 folder:share                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'folder',
				],
			},
		},
		default: '',
		description: 'The ID of the folder to share.',
	},
	{
		displayName: 'Accessible By',
		name: 'accessibleBy',
		type: 'options',
		options: [
			{
				name: 'User',
				value: 'user',
			},
			{
				name: 'Group',
				value: 'group',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'folder',
				],
			},
		},
		default: 'user',
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
					'folder',
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
					'folder',
				],
				accessibleBy: [
					'user',
				],
				useEmail: [
					true,
				],
			},
		},
		default: '',
		description: `The user's email address to share the folder with.`,
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
					'folder',
				],
				accessibleBy: [
					'user',
				],
				useEmail: [
					false,
				],
			},
		},
		default: '',
		description: `The user's ID to share the folder with.`,
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
					'folder',
				],
				accessibleBy: [
					'group',
				],
			},
		},
		default: '',
		description: `The group's ID to share the folder with.`,
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
					'folder',
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
					'folder',
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
	/*                                 folder:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Folder ID',
		name: 'folderId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'update',
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
				displayName: 'Can Non-Owners Invite',
				name: 'can_non_owners_invite',
				type: 'boolean',
				default: false,
				description: 'Specifies if users who are not the owner of the folder can invite new collaborators to the folder.',
			},
			{
				displayName: 'Can Non-Owners View Colaborators',
				name: 'can_non_owners_view_collaborators',
				type: 'boolean',
				default: false,
				description: 'Restricts collaborators who are not the owner of this folder from viewing other collaborations on this folder.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The optional description of this folder.',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of attributes to include in the response. This can be used to request fields that are not normally returned in a standard response.',
			},
			{
				displayName: 'Is Collaboration Restricted To Enterprise',
				name: 'is_collaboration_restricted_to_enterprise',
				type: 'boolean',
				default: false,
				description: 'Specifies if new invites to this folder are restricted to users within the enterprise. This does not affect existing collaborations.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The optional new name for this folder.',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'The parent folder for this folder. Use this to move the folder or to restore it out of the trash.',
			},
			{
				displayName: 'Shared Link',
				name: 'shared_link',
				type: 'collection',
				typeOptions: {
					multipleValues: false,
				},
				description: 'Share link information.',
				placeholder: 'Add Shared Link Config',
				default: {},
				options: [
					{
						displayName: 'Access',
						name: 'access',
						type: 'options',
						options: [
							{
								name: 'Collaborators',
								value: 'collaborators',
								description: 'Only those who have been invited to the folder',
							},
							{
								name: 'Company',
								value: 'company',
								description: 'only people within the company',
							},
							{
								name: 'Open',
								value: 'open',
								description: 'Anyone with the link',
							},
						],
						default: 'open',
					},
					{
						displayName: 'Password',
						name: 'password',
						type: 'string',
						displayOptions: {
							show: {
								access: [
									'open',
								],
							},
						},
						default: '',
						description: 'The password required to access the shared link. Set the password to null to remove it.',
					},
					{
						displayName: 'Permissions',
						name: 'permissions',
						type: 'collection',
						placeholder: 'Add Permition',
						default: {},
						options: [
							{
								displayName: 'Can Download',
								name: 'can_download',
								type: 'boolean',
								default: false,
								description: 'If the shared link allows for downloading of files.',
							},
							{
								displayName: 'Unshared At',
								name: 'unshared_at',
								type: 'dateTime',
								default: '',
								description: 'The timestamp at which this shared link will expire.',
							},
							{
								displayName: 'Vanity Name',
								name: 'vanity_name',
								type: 'string',
								default: '',
								description: 'Defines a custom vanity name to use in the shared link URL, for example https://app.box.com/v/my-shared-link.',
							},
						],
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'The tags for this item. These tags are shown in the Box web app and mobile apps next to an item.',
					},
				],
			},
		],
	},
];
