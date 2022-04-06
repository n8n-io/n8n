import {
	INodeProperties,
} from 'n8n-workflow';

import {
	makeSimpleField,
} from './SharedFields';

export const attendanceOperations: INodeProperties[] = [
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
		],
		default: 'create',
		description: 'Operation to perform',
	},
];

export const attendanceFields: INodeProperties[] = [
	// ----------------------------------------
	//            attendance: create
	// ----------------------------------------
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person to create an attendance for.',
		type: 'string',
		default: '',
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
		type: 'string',
		default: '',
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
	makeSimpleField('attendance', 'create'),

	// ----------------------------------------
	//             attendance: get
	// ----------------------------------------
	{
		displayName: 'Event ID',
		name: 'eventId',
		description: 'ID of the event whose attendance to retrieve.',
		type: 'string',
		default: '',
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
		type: 'string',
		default: '',
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
	makeSimpleField('attendance', 'get'),

	// ----------------------------------------
	//            attendance: getAll
	// ----------------------------------------
	{
		displayName: 'Event ID',
		name: 'eventId',
		description: 'ID of the event to create an attendance for.',
		type: 'string',
		default: '',
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
	makeSimpleField('attendance', 'getAll'),
];
