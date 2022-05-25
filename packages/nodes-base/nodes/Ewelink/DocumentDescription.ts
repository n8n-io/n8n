import {
	INodeProperties,
} from 'n8n-workflow';

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
				show: {
						resource: [
								'document',
						],
				},
		},
		options: [
				{
						name: 'Create',
						value: 'createDoc',
						description: 'Create a document in collection',
				},
				{
					name: 'Delete',
					value: 'deleteDoc',
					description: 'Delete document in collection',
				},
				{
					name: 'Get',
					value: 'getDoc',
					description: 'Get a document in collection',
				},
				{
					name: 'Get All',
					value: 'getAllDocs',
					description: 'Get all documents in collection',
				},
				{
					name: 'Update',
					value: 'updateDoc',
					description: 'Get all documents in collection',
				},
		],
		default: 'getAllDocs',
		description: 'Select the operation to perform on the collection of documents',
	},
];

export const documentFields: INodeProperties[] = [
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		type: 'string',
		required: true,
		displayOptions: {
				show: {
						operation: [
								'createDoc',
								'getAllDocs',
								'getDoc',
								'updateDoc',
								'deleteDoc',
						],
						resource: [
								'document',
						],
				},
		},
		default:'',
		description:'Collection to list/create documents in',
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		required: true,
		displayOptions: {
				show: {
						operation: [
								'getDoc',
								'updateDoc',
								'deleteDoc',
						],
						resource: [
								'document',
						],
				},
		},
		default:'',
		description:'Document ID to get from collection',
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'json',
		required: true,
		displayOptions: {
				show: {
						operation: [
								'createDoc',
								'updateDoc',
						],
						resource: [
								'document',
						],
				},
		},
		default:'{"attributeName1":"attribute-value1", "attributeName2":"attribute-value2"}',
		description:'Body to create document with',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
				show: {
					operation: [
						'createDoc',
						'getAllDocs',
					],
					resource: [
							'document',
					],
				},
		},
		options: [
				{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 1000,
						},
						default: 50,
						description: 'Max number of results to return',
				},
				{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						default: 0,
						description: 'Offset value. The default value is 0. Use this value to manage pagination. [learn more about pagination](https://appwrite.io/docs/pagination).',
				},
				{
					displayName: 'Cursor',
					name: 'cursor',
					type: 'string',
					default: '',
					description: 'ID of the document used as the starting point for the query, excluding the document itself. Should be used for efficient pagination when working with large sets of data. [learn more about pagination](https://appwrite.io/docs/pagination).',
				},
				{
					displayName: 'Cursor Direction',
					name: 'cursorDirection',
					type: 'string',
					default: '',
					description: 'Direction of the cursor',
				},
			],
	},
];
