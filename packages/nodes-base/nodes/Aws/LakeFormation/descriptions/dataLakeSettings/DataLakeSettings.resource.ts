import type { INodeProperties } from 'n8n-workflow';
import { handleLakeFormationError } from '../../helpers/errorHandler';

export const dataLakeSettingsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		displayOptions: {
			show: {
				resource: ['dataLakeSettings'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get data lake settings',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSLakeFormation.GetDataLakeSettings',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'DataLakeSettings',
								},
							},
							handleLakeFormationError,
						],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update data lake settings',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSLakeFormation.PutDataLakeSettings',
						},
					},
					output: {
						postReceive: [handleLakeFormationError],
					},
				},
			},
		],
	},
];

export const dataLakeSettingsFields: INodeProperties[] = [
	{
		displayName: 'Catalog ID',
		name: 'catalogId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['dataLakeSettings'],
			},
		},
		routing: {
			request: {
				body: {
					CatalogId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Data Lake Settings',
		name: 'dataLakeSettings',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions: {
			show: {
				resource: ['dataLakeSettings'],
				operation: ['update'],
			},
		},
		routing: {
			request: {
				body: {
					DataLakeSettings: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
