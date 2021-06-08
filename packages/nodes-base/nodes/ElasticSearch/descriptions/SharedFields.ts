export const makeSpecifyIndexByField = (resource: 'document' | 'index') => ({
	displayName: 'Specify Index By',
	name: 'specifyIndexBy',
	description: 'Method for specifying the index.',
	type: 'options',
	required: true,
	options: [
		{
			name: 'ID',
			value: 'id',
		},
		{
			name: 'List',
			value: 'list',
		},
	],
	default: 'list',
	displayOptions: {
		show: {
			resource: [
				resource,
			],
			operation: [
				'delete',
				'get',
				'update',
				'getAll',
				'index',
			],
		},
	},
});

export const makeIndexListField = (resource: 'document' | 'index', operation: string) => {
	const operationVerb = operation === 'get' ? 'retrieve' : operation;
	const description = resource === 'document'
		? `Index containing the document to ${operationVerb}.`
		: `Index to ${operationVerb}.`;

	return {
		displayName: 'Index',
		name: 'indexId',
		description,
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getIndices',
		},
		displayOptions: {
			show: {
				resource: [
					resource,
				],
				operation: [
					operation,
				],
				specifyIndexBy: [
					'list',
				],
			},
		},
	};
};

export const makeDocumentListField = (resource: 'document' | 'index', operation: string) => ({
	displayName: 'Document',
	name: 'documentId',
	description: `Document to ${operation}.`,
	type: 'options',
	required: true,
	default: [],
	typeOptions: {
		loadOptionsDependsOn: [
			'indexId',
		],
		loadOptionsMethod: 'getDocuments',
	},
	displayOptions: {
		show: {
			resource: [
				resource,
			],
			operation: [
				operation,
			],
			specifyIndexBy: [
				'list',
			],
		},
	},
});

export const makeIndexInputField = (resource: 'document' | 'index', operation: string) => {
	const operationVerb = operation === 'get' ? 'retrieve' : operation;
	const description = resource === 'document'
		? `Index containing the document to ${operationVerb}.`
		: `Index to ${operationVerb}.`;

	return {
		displayName: 'Index ID',
		name: 'indexId',
		description,
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					resource,
				],
				operation: [
					operation,
				],
				specifyIndexBy: [
					'id',
				],
			},
		},
	};
};

export const makeDocumentInputField = (resource: 'document' | 'index', operation: string) => {
	const operationInDescription = operation === 'get' ? 'retrieve' : operation;

	return {
		displayName: 'Document ID',
		name: 'documentId',
		description: `ID of the document to ${operationInDescription}.`,
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					resource,
				],
				operation: [
					operation,
				],
				specifyIndexBy: [
					'id',
				],
			},
		},
	};
};

