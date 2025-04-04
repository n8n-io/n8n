import { get } from 'lodash';
import type { IGetNodeParameterOptions, ILoadOptionsFunctions } from 'n8n-workflow';

import * as resourceMapping from '../../../v2/methods/resourceMapping';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				tables: [
					{
						id: 'tblTestTable',
						name: 'Test Table',
						fields: [
							{
								id: 'fldName',
								name: 'Name',
								type: 'singleLineText',
							},
							{
								id: 'fldEmail',
								name: 'Email',
								type: 'email',
							},
							{
								id: 'fldSelect',
								name: 'Status',
								type: 'singleSelect',
								options: {
									choices: [
										{
											id: 'selActive',
											name: 'Active',
											color: 'green',
										},
										{
											id: 'selInactive',
											name: 'Inactive',
											color: 'red',
										},
									],
								},
							},
						],
					},
				],
			};
		}),
	};
});

const nodeParameters = {
	base: {
		value: 'appBaseId',
	},
	table: {
		value: 'tblTestTable',
	},
};

const mockLoadOptionsFunctions = {
	getNodeParameter(
		parameterName: string,
		fallbackValue: unknown,
		options?: IGetNodeParameterOptions,
	) {
		const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
		return get(nodeParameters, parameter, fallbackValue);
	},
} as unknown as ILoadOptionsFunctions;

describe('Test Airtable resourceMapping methods', () => {
	describe('getColumns', () => {
		it('should return fields with IDs as identifiers, not names', async () => {
			const result = await resourceMapping.getColumns.call(mockLoadOptionsFunctions);

			// Verify the API was called correctly
			expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appBaseId/tables');

			// Verify the returned fields use IDs as identifiers
			expect(result.fields).toHaveLength(3);
			expect(result.fields).toMatchObject([
				{
					id: 'fldName',
					displayName: 'Name',
					type: 'string',
				},
				{
					id: 'fldEmail',
					displayName: 'Email',
					type: 'string',
				},
				{
					id: 'fldSelect',
					displayName: 'Status',
					type: 'options',
					options: [
						{ name: 'Active', value: 'selActive' },
						{ name: 'Inactive', value: 'selInactive' },
					],
				},
			]);
		});
	});

	describe('getColumnsWithRecordId', () => {
		it('should return fields with IDs as identifiers including record ID field', async () => {
			const result = await resourceMapping.getColumnsWithRecordId.call(mockLoadOptionsFunctions);

			// Verify the API was called correctly
			expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appBaseId/tables');

			// Verify the returned fields include the record ID field
			expect(result.fields).toHaveLength(4);
			expect(result.fields).toMatchObject([
				{
					id: 'id',
					displayName: 'id',
					type: 'string',
					defaultMatch: true,
				},
				{
					id: 'fldName',
					displayName: 'Name',
				},
				{
					id: 'fldEmail',
					displayName: 'Email',
				},
				{
					id: 'fldSelect',
					displayName: 'Status',
				},
			]);
		});
	});
});
