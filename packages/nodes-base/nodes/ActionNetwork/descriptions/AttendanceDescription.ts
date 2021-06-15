import {
	INodeProperties,
} from 'n8n-workflow';

export const attendanceOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'attendance',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
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
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const attendanceFields = [
	// ----------------------------------------
	//            attendance: create
	// ----------------------------------------
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person to create an attendance for.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPersons',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attendance',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Event ID',
		name: 'eventId',
		description: 'ID of the event to create an attendance for.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getEvents',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attendance',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------------
	//             attendance: get
	// ----------------------------------------
	{
		displayName: 'Event ID',
		name: 'eventId',
		description: 'ID of the event whose attendance to retrieve.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getEvents',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attendance',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Attendance ID',
		name: 'attendanceId',
		description: 'ID of the attendance to retrieve.',
		typeOptions: {
			loadOptionsDependsOn: [
				'eventId',
			],
			loadOptionsMethod: 'getAttendances',
		},
		type: 'options',
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attendance',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//            attendance: getAll
	// ----------------------------------------
	{
		displayName: 'Event ID',
		name: 'eventId',
		description: 'ID of the event to create an attendance for.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getEvents',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attendance',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'attendance',
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
		default: 50,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'attendance',
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

	// ----------------------------------------
	//            attendance: update
	// ----------------------------------------
	{
		displayName: 'Event ID',
		name: 'eventId',
		description: 'ID of the event whose attendance to update.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getEvents',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attendance',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Attendance ID',
		name: 'attendanceId',
		description: 'ID of the attendance to update.',
		typeOptions: {
			loadOptionsDependsOn: [
				'eventId',
			],
			loadOptionsMethod: 'getAttendances',
		},
		type: 'options',
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attendance',
				],
				operation: [
					'update',
				],
			},
		},
	},
] as INodeProperties[];
