import { INodeProperties } from "n8n-workflow";

export const noteOpeations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'note',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new note',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a note',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all notes',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a note',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const noteFields = [

/* -------------------------------------------------------------------------- */
/*                                note:create                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Notebook',
		name: 'notebookGuid',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getNotebooks'
		},
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'create'
				]
			},
		},
		description: 'Create resources under the given notebook.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'create'
				]
			},
		},
		description: 'the title of the note',
	},
	{
		displayName: 'XML Parameters',
		name: 'xmlParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'note'
				],
				operation: [
					'create',
				]
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'create'
				],
				xmlParameters: [
					false,
				]
			},
		},
		description: 'the body of the note, formatted as ENML (Evernote Markup Language)',
	},
	{
		displayName: 'Content',
		name: 'contentXML',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'create'
				],
				xmlParameters: [
					true,
				]
			},
		},
		description: 'the body of the note, formatted as ENML (Evernote Markup Language)',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Tags',
				name: 'tagGuids',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags'
				},
				default: [],
				description: 'If present, the list of tags (by GUID) that must be present on the notes.',
			},
		]
	},

/* -------------------------------------------------------------------------- */
/*                                 note:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'getAll',
				]
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
				resource: [
					'note',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Include Title',
				name: 'includeTitle',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Content Length',
				name: 'includeContentLength',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Created',
				name: 'includeCreated',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Updated',
				name: 'includeUpdated',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Deleted',
				name: 'includeDeleted',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Update Sequence Num',
				name: 'includeUpdateSequenceNum',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Notebook Guid',
				name: 'includeNotebookGuid',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Tag Guids',
				name: 'includeTagGuids',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Attributes',
				name: 'includeAttributes',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Largest Resource Mime',
				name: 'includeLargestResourceMime',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Largest Resource Size',
				name: 'includeLargestResourceSize',
				type: 'boolean',
				default: false,
			},
		]
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Notebook',
				name: 'notebookGuid',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getNotebooks'
				},
				default: [],
				description: 'If present, the Guid of the notebook that must contain the notes',
			},
			{
				displayName: 'Tags',
				name: 'tagGuids',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags'
				},
				default: [],
				description: 'If present, the list of tags (by GUID) that must be present on the notes.',
			},
			{
				displayName: 'Ascending',
				name: 'ascending',
				type: 'boolean',
				default: false,
				description: 'If true, the results will be ascending in the requested sort order. If false, the results will be descending.',
			},
			{
				displayName: 'Words',
				name: 'words',
				type: 'string',
				default: '',
				description: 'If present, a search query string that will filter the set of notes to be returned. Accepts the full search grammar documented in the Evernote API Overview.',
			},
			{
				displayName: 'Timezone',
				name: 'timeZone',
				type: 'string',
				default: '',
				description: 'The zone ID for the user, which will be used to interpret any dates or times in the queries that do not include their desired zone information. For example, if a query requests notes created "yesterday", this will be evaluated from the provided time zone, if provided. The format must be encoded as a standard zone ID such as "America/Los_Angeles".',
			},
			{
				displayName: 'Inactive',
				name: 'inactive',
				type: 'boolean',
				default: false,
				description: 'If true, then only notes that are not active (i.e. notes in the Trash) will be returned. Otherwise, only active notes will be returned. There is no way to find both active and inactive notes in a single query.',
			},
			{
				displayName: 'Emphasized',
				name: 'emphasized',
				type: 'string',
				default: '',
				description: 'If present, a search query string that may or may not influence the notes to be returned, both in terms of coverage as well as of order. Think of it as a wish list, not a requirement. Accepts the full search grammar documented in the Evernote API Overview.',
			},
			{
				displayName: 'Include All Readable Notebooks',
				name: 'includeAllReadableNotebooks',
				type: 'boolean',
				default: false,
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                  note:get                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Note GUID',
		name: 'noteGUID',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'get'
				],
			},
		},
		description: 'Note ID',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'With Content',
				name: 'withContent',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'With Resources Data',
				name: 'withResourcesData',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'With Resources Recognition',
				name: 'withResourcesRecognition',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'With Resources Alternate Data',
				name: 'withResourcesAlternateData',
				type: 'boolean',
				default: false,
			},
		]
	},

/* -------------------------------------------------------------------------- */
/*                                 note:delete                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Note GUID',
		name: 'noteGUID',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'delete'
				],
			},
		},
		description: 'Note ID',
	},
] as INodeProperties[];
