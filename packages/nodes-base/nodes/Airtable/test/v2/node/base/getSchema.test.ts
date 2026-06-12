import { mockDeep } from 'jest-mock-extended';
import get from 'lodash/get';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import * as getSchema from '../../../../v2/actions/base/getSchema.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function (_: string, endpoint: string) {
			if (endpoint === 'meta/bases/appWithTables/tables') {
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
			}
			return { tables: [] };
		}),
	};
});

describe('Test AirtableV2, base => getSchema', () => {
	it('should return all bases', async () => {
		const nodeParameters = {
			resource: 'base',
			operation: 'getSchema',
			base: {
				value: '={{$json.id}}',
			},
		};

		const items = [
			{
				json: { id: 'appEmptyBase1' },
			},
			{
				json: { id: 'appEmptyBase2' },
			},
		];

		await getSchema.execute.call(
			mockDeep<IExecuteFunctions>({
				getInputData: jest.fn(() => items),
				getNodeParameter: jest.fn((param: string, itemIndex: number) => {
					if (param === 'base') {
						return items[itemIndex].json.id;
					}

					return get(nodeParameters, param);
				}),
			}),
			items,
		);

		expect(transport.apiRequest).toBeCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appEmptyBase1/tables');
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appEmptyBase2/tables');
	});

	it('should return schema when base has tables', async () => {
		const nodeParameters = {
			resource: 'base',
			operation: 'getSchema',
			base: {
				value: 'appWithTables',
			},
		};

		const items = [
			{
				json: {},
			},
		];

		const result = await getSchema.execute.call(
			createMockExecuteFunction({
				...nodeParameters,
			}),
			items,
		);

		// Verify the API was called correctly
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'meta/bases/appWithTables/tables');

		// Verify the returned schema contains the correct field IDs using simplified expect
		expect(result).toHaveLength(1);

		const table = result[0].json as IDataObject;
		expect(table).toMatchObject({
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
		});
	});
});
