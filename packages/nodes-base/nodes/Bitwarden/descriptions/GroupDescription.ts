import {
	INodeProperties,
} from 'n8n-workflow';

export const groupOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Get Members',
				value: 'getMembers',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'group',
				],
			},
		},
	},
] as INodeProperties[];

export const groupFields = [
	// ----------------------------------
	//       group: shared
	// ----------------------------------
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		required: true,
		description: 'The identifier of the group.',
		default: '',
		placeholder: '5e59c8c7-e05a-4d17-8e85-acc301343926',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'delete',
					'get',
					'getMembers',
					'update',
				],
			},
		},
	},
	// ----------------------------------
	//       group: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all available results for the query.',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'Number of results to return for the query.',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	// ----------------------------------
	//       group: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The name of the group to create.',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Collections',
				name: 'collections',
				type: 'multiOptions',
				description: 'The collections to assign to this group.',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getCollections',
				},
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				description: 'The external identifier to set to this group.',
				default: '',
			},
			{
				displayName: 'Access All',
				name: 'accessAll',
				type: 'boolean',
				default: false,
			},
		],
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'create',
				],
			},
		},
	},
	// ----------------------------------
	//       group: update
	// ----------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the group to update.',
			},
			{
				displayName: 'Collections',
				name: 'collections',
				type: 'multiOptions',
				description: 'The collections to assign to this group.',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getCollections',
				},
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				description: 'The external identifier to set to this group.',
				default: '',
			},
			{
				displayName: 'Access All',
				name: 'accessAll',
				type: 'boolean',
				default: false,
			},
		],
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'update',
				],
			},
		},
	},
] as INodeProperties[];

type GroupSchema = {
	name: string;
	collections: string[];
	accessAll: boolean;
	externalId: string;
};

export type GroupUpdateFields = GroupSchema;

export type GroupCreationAdditionalFields = Omit<GroupSchema, 'name'>;
