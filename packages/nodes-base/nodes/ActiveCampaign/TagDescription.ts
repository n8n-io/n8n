import {
	INodeProperties,
} from 'n8n-workflow';

import {
	activeCampaignDefaultGetAllProperties,
} from './GenericFunctions';

export const tagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a tag',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a tag',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a tag',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all tags',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a tag',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const tagFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:create
	// ----------------------------------
	{
		displayName: 'Type',
		name: 'tagType',
		type: 'options',
		default: 'contact',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'tag',
				],
			},
		},
		options: [
			{
				name: 'Contact',
				value: 'contact',
				description: 'Tag contact',
			},
			{
				name: 'Template',
				value: 'template',
				description: 'Tag template',
			},
		],
		description: 'Tag-type of the new tag',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'tag',
				],
			},
		},
		description: 'Name of the new tag',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'tag',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the new tag',
			},
		],
	},
	// ----------------------------------
	//         tag:update
	// ----------------------------------
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'tag',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the tag to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		description: 'The fields to update.',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'tag',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				description: 'Name of the contact.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the tag being updated',
			},
		],
	},
	// ----------------------------------
	//         tag:delete
	// ----------------------------------
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'tag',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the tag to delete.',
	},
	// ----------------------------------
	//         contact:get
	// ----------------------------------
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'tag',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the tag to get.',
	},
	// ----------------------------------
	//         tag:getAll
	// ----------------------------------
	...activeCampaignDefaultGetAllProperties('tag', 'getAll'),
];
