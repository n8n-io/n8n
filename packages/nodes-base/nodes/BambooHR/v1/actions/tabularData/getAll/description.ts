import {
	TabularDataProperties,
} from '../../Interfaces';

export const tabularDataGetAllDescription: TabularDataProperties = [
	{
		displayName: 'Table Name',
		name: 'table',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'tabularData',
				],
			},
		},
		default: '',
		description: 'Name of the table',
	},
	{
		displayName: 'Since',
		name: 'since',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'tabularData',
				],
			},
		},
		default: '',
	},
];
