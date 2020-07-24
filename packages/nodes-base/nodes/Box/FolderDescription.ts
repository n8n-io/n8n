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
] as INodeProperties[];
