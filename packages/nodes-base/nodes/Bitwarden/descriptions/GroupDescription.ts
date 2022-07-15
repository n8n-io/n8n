import {
	INodeProperties,
} from 'n8n-workflow';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a group',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a group',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a group',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all groups',
			},
			{
				name: 'Get Members',
				value: 'getMembers',
				action: 'Get group members',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a group',
			},
			{
				name: 'Update Members',
				value: 'updateMembers',
				action: 'Update group members',
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
];

export const groupFields: INodeProperties[] = [
	// ----------------------------------
	//       group: shared
	// ----------------------------------
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		required: true,
		description: 'The identifier of the group',
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
					'updateMembers',
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
		description: 'Whether to return all results or only up to a given limit',
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
		typeOptions: {
			minValue: 1,
		},
		default: 10,
		description: 'Max number of results to return',
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
		required: true,
		description: 'The name of the group to create',
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
		displayName: 'Access All',
		name: 'accessAll',
		type: 'boolean',
		default: false,
		description: 'Whether to allow this group to access all collections within the organization, instead of only its associated collections. If set to true, this option overrides any collection assignments.',
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
				displayName: 'Collection Names or IDs',
				name: 'collections',
				type: 'multiOptions',
				description: 'The collections to assign to this group. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getCollections',
				},
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				description: 'The external identifier to set to this group',
				default: '',
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
				displayName: 'Access All',
				name: 'accessAll',
				type: 'boolean',
				default: false,
				description: 'Whether to allow this group to access all collections within the organization, instead of only its associated collections. If set to true, this option overrides any collection assignments.',
			},
			{
				displayName: 'Collection Names or IDs',
				name: 'collections',
				type: 'multiOptions',
				description: 'The collections to assign to this group. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getCollections',
				},
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				description: 'The external identifier to set to this group',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the group to update',
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

	// ----------------------------------
	//      group: updateMembers
	// ----------------------------------
	{
		displayName: 'Member IDs',
		name: 'memberIds',
		type: 'string',
		default: '',
		description: 'Comma-separated list of IDs of members to set in a group',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'updateMembers',
				],
			},
		},
	},
];

type GroupSchema = {
	name: string;
	collections: string[];
	accessAll: boolean;
	externalId: string;
};

export type GroupUpdateFields = GroupSchema;

export type GroupCreationAdditionalFields = Omit<GroupSchema, 'name'>;
