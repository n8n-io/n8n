import {
	CompanyFileProperties,
} from '../../Interfaces';

export const companyFileAddCategoryDescription: CompanyFileProperties = [
	{
		displayName: 'Category Name',
		name: 'categoryName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'addCategory',
				],
				resource: [
					'companyFile',
				],
			},
		},
		default: '',
		description: 'Name of the new company files category',
	},
];
