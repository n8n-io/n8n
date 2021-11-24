import {
  CompanyFilesProperties,
} from '../../Interfaces';

export const companyFilesGetAllDescription: CompanyFilesProperties = [
	{
		displayName: 'Only Files',
		name: 'onlyFiles',
		type: 'boolean',
		default: true,
		description: 'Returns all the files without the categories.',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'companyFiles',
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
				operation: [
					'getAll',
				],
				resource: [
					'companyFiles',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'companyFiles',
				],
				returnAll: [
					false,
				],
			},
		},
	},
];
