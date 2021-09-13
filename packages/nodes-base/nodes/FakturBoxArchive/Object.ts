import {
	INodeProperties
} from 'n8n-workflow'

export const objectOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'object',
				],
			},
		},
		options: [
			{
				name: 'getObject',
				value: 'getobject',
				description: 'Retrieves a single object by id',
			},
			{
				name: 'getObjectProperties',
				value: 'getobjectproperties',
				description: 'Retrieves all properties of a single object by id, in an easily displayable list'
			},
			{
				name: 'setObjectProperties',
				value: 'setobjectproperties',
				description: 'Creates or edits an object using a list of object properties, as received via GetObjectProperties'
			},
			{
				name: 'setDeleteFlag',
				value: 'setdeleteflag',
				description: 'Sets the delete Flag for an object',
			},
			{
				name: 'createObject (function)',
				value: 'createobject',
				description: 'Creates an Object'
			},
			{
				name: 'UploadNewVersion (function)',
				value: 'uploadnewversion',
				description: 'Uploads a new Version of an object',
			},
		],
		default: 'getobject',
		description: 'The operation to perform.',
	},
] as INodeProperties[]

export const objectFields = [
	{
		displayName: 'ObjectId',
		name: 'objectid',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'getobject',
					'getobjectproperties',
					'setdeleteflag',
					'uploadnewversion',
					'setobjectproperties',
				],
				resource: [
					'object',
				],
			},
		},
		default: '',
		description: 'The objects id',
	},
	{
		displayName: 'VersionComment',
		name: 'versioncomment',
		required: false,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'uploadnewversion',
				],
				resource: [
					'object',
				],
			},
		},
		default: '',
		description: 'The version comment',
	},
	{
		displayName: 'VersionExternalMetaData',
		name: 'versionexternalmetadata',
		required: false,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'uploadnewversion',
				],
				resource: [
					'object',
				],
			},
		},
		default: '',
		description: 'The version´s external metadata',
	},
	{
		displayName: 'CheckIn',
		name: 'checkin',
		required: false,
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'uploadnewversion',
				],
				resource: [
					'object',
				],
			},
		},
		default: false,
		description: '',
	},
	{
		displayName: 'AppendToPrevious',
		name: 'appendtoprevious',
		required: false,
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'uploadnewversion',
				],
				resource: [
					'object',
				],
			},
		},
		default: false,
		description: '',
	},
	{
		displayName: 'DeleteReason',
		name: 'deletereason',
		required: true,
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'setdeleteflag'
				],
				resource: [
					'object',
				],
			},
		},
		options: [
			{
				name: 'Other',
				value: '0',
			},
			{
				name: 'Invalid',
				value: '1',
			},
			{
				name: 'Duplicate',
				value: '2',
			},
			{
				name: 'Test',
				value: '3',
			},
			{
				name: 'Expired',
				value: '4',
			},
			{
				name: 'DataPrivacyProtection',
				value: '5',
			},
		],
		default: '',
		description: 'The delete reason',
	},
	{
		displayName: 'IncludeSubItems',
		name: 'includesubitems',
		required: true,
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'setdeleteflag'
				],
				resource: [
					'object',
				],
			},
		},
		default: false,
		description: 'The delete reason',
	},
	{
		displayName: 'DeleteReasonText',
		name: 'deletereasontext',
		required: false,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'setdeleteflag'
				],
				resource: [
					'object',
				],
			},
		},
		default: '',
		description: 'The delete reason text',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'getobject',
				],
				resource: [
					'object',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'SubselectPath',
				name: 'subselectpath',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'getobjectproperties',
				],
				resource: [
					'object',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'ObjectTypeId',
				name: 'objecttypeid',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Purpose',
				name: 'purpose',
				type: 'options',
				options: [
					{
						name: 'DisplayObject',
						value: '0'
					},
					{
						name: 'NewObject',
						value: '1'
					},
					{
						name: 'Search',
						value: '2'
					},
					{
						name: 'MetadataGeneration',
						value: '3'
					},
					{
						name: 'Sort',
						value: '4'
					},
					{
						name: 'ChangeType',
						value: '5'
					},
					{
						name: 'Export',
						value: '6'
					},
				],
				default: '',
			},
			{
				displayName: 'ParentObject',
				name: 'parentobject',
				type: 'number',
				default: '',
			},
		],
	},
	{
		displayName: 'Upload Version',
		name: 'uploadversion',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: [
					'createobject',
				],
				resource: [
					'object',
				],
			},
		},
	},
	{
		displayName: 'BinaryData',
		name: 'binarydata',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				uploadversion: [
					true,
				],
				operation: [
					'createobject',
				],
				resource: [
					'object',
				],
			},
		},
		default: '',
		description: 'The binary data of the object to upload',
	},
	{
		displayName: 'BinaryData',
		name: 'binarydata_newversion',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'uploadnewversion',
				],
				resource: [
					'object',
				],
			},
		},
		default: '',
		description: 'The binary data of the object to upload',
	},
	{
		displayName: 'Object name (OBJ_NAME)',
		name: 'objname',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'createobject',
				],
				resource: [
					'object',
				],
			},
		},
		default: '',
		description: 'The objects name (required)',
	},
	{
		displayName: 'Objecttype',
		name: 'objtype',
		required: true,
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'createobject',
				],
				resource: [
					'object',
				],
			},
		},
		default: '',
		description: 'The ObjecttypeId',
	},
	{
		displayName: 'Parent',
		name: 'objparent',
		required: true,
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'createobject',
				],
				resource: [
					'object',
				],
			},
		},
		default: '',
		description: 'The Parents ObjectId',
	},
	{
		displayName: 'Additional Properties',
		name: 'properties',
		placeholder: 'Add Propery',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'createobject',
					'uploadnewversion',
					'setobjectproperties'
				],
				resource: [
					'object',
				],
			},
		},
		description: 'Additional property fields',
		default: {},
		options: [
			{
				name: 'parameter',
				displayName: 'Property',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the parameter.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the parameter.',
					},
				],
			},
		],
	},
] as INodeProperties[]