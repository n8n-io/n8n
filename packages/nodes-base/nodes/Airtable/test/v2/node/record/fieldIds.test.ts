import * as create from '../../../../v2/actions/record/create.operation';
import * as update from '../../../../v2/actions/record/update.operation';
import * as get from '../../../../v2/actions/record/get.operation';
import * as search from '../../../../v2/actions/record/search.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function (method: string, endpoint: string, body: any, query: any) {
			if (method === 'GET' && endpoint.includes('/meta/bases/')) {
				// Mock response for field mapping
				return {
					tables: [
						{
							id: 'tblltable',
							fields: [
								{ id: 'fld1234', name: 'Name' },
								{ id: 'fld5678', name: 'Email' },
								{ id: 'fld9012', name: 'Status' },
							],
						},
					],
				};
			}
			if (method === 'POST') {
				return {
					id: 'recNew',
					fields: body.fields,
				};
			}
			if (method === 'PATCH') {
				return {
					records: body.records.map((record: any) => ({
						id: record.id,
						fields: record.fields,
					})),
				};
			}
			if (method === 'GET' && query?.returnFieldsByFieldId) {
				return {
					id: 'recXXX',
					fields: {
						fld1234: 'John Doe',
						fld5678: 'john@example.com',
					},
				};
			}
			if (method === 'GET') {
				return {
					records: [
						{
							id: 'rec1',
							fields: query?.returnFieldsByFieldId
								? { fld1234: 'Test Name', fld5678: 'test@example.com' }
								: { Name: 'Test Name', Email: 'test@example.com' },
						},
					],
				};
			}
		}),
		getFieldNamesAndIds: jest.fn(async function () {
			const mapping = new Map();
			mapping.set('Name', 'fld1234');
			mapping.set('Email', 'fld5678');
			mapping.set('Status', 'fld9012');
			return mapping;
		}),
		apiRequestAllItems: jest.fn(async function (
			_method: string,
			_endpoint: string,
			_body: any,
			query: any,
		) {
			return {
				records: [
					{
						id: 'rec1',
						fields: query?.returnFieldsByFieldId
							? { fld1234: 'Test Name', fld5678: 'test@example.com' }
							: { Name: 'Test Name', Email: 'test@example.com' },
					},
					{
						id: 'rec2',
						fields: query?.returnFieldsByFieldId
							? { fld1234: 'Another Name', fld5678: 'another@example.com' }
							: { Name: 'Another Name', Email: 'another@example.com' },
					},
				],
			};
		}),
		batchUpdate: jest.fn(async function (_endpoint: string, _body: any, records: any[]) {
			return {
				records: records.map((record) => ({
					id: record.id,
					fields: record.fields,
				})),
			};
		}),
	};
});

describe('Test AirtableV2 Field IDs functionality', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Create operation with field IDs', () => {
		it('should use field IDs when useFieldIds is enabled', async () => {
			const nodeParameters = {
				operation: 'create',
				columns: {
					mappingMode: 'defineBelow',
					value: {
						Name: 'John Doe',
						Email: 'john@example.com',
					},
				},
				useFieldIds: true,
				options: {},
			};

			const items = [
				{
					json: {},
				},
			];

			await create.execute.call(
				createMockExecuteFunction(nodeParameters),
				items,
				'appYoLbase',
				'tblltable',
			);

			expect(transport.getFieldNamesAndIds).toHaveBeenCalledWith('appYoLbase', 'tblltable');
			expect(transport.apiRequest).toHaveBeenCalledWith('POST', 'appYoLbase/tblltable', {
				typecast: false,
				fields: {
					fld1234: 'John Doe',
					fld5678: 'john@example.com',
				},
			});
		});

		it('should use field names when useFieldIds is disabled', async () => {
			const nodeParameters = {
				operation: 'create',
				columns: {
					mappingMode: 'defineBelow',
					value: {
						Name: 'John Doe',
						Email: 'john@example.com',
					},
				},
				useFieldIds: false,
				options: {},
			};

			const items = [
				{
					json: {},
				},
			];

			await create.execute.call(
				createMockExecuteFunction(nodeParameters),
				items,
				'appYoLbase',
				'tblltable',
			);

			expect(transport.getFieldNamesAndIds).not.toHaveBeenCalled();
			expect(transport.apiRequest).toHaveBeenCalledWith('POST', 'appYoLbase/tblltable', {
				typecast: false,
				fields: {
					Name: 'John Doe',
					Email: 'john@example.com',
				},
			});
		});
	});

	describe('Update operation with field IDs', () => {
		it('should use field IDs when useFieldIds is enabled', async () => {
			const nodeParameters = {
				operation: 'update',
				columns: {
					mappingMode: 'defineBelow',
					matchingColumns: ['id'],
					value: {
						id: 'recXXX',
						Name: 'Jane Doe',
						Email: 'jane@example.com',
					},
				},
				useFieldIds: true,
				options: {},
			};

			const items = [
				{
					json: {},
				},
			];

			await update.execute.call(
				createMockExecuteFunction(nodeParameters),
				items,
				'appYoLbase',
				'tblltable',
			);

			expect(transport.getFieldNamesAndIds).toHaveBeenCalledWith('appYoLbase', 'tblltable');
			expect(transport.batchUpdate).toHaveBeenCalledWith(
				'appYoLbase/tblltable',
				{ typecast: false },
				[
					{
						id: 'recXXX',
						fields: {
							fld1234: 'Jane Doe',
							fld5678: 'jane@example.com',
						},
					},
				],
			);
		});
	});

	describe('Get operation with returnFieldsByFieldId', () => {
		it('should request fields by ID when returnFieldsByFieldId is enabled', async () => {
			const nodeParameters = {
				operation: 'get',
				id: 'recXXX',
				returnFieldsByFieldId: true,
				options: {},
			};

			const items = [
				{
					json: {},
				},
			];

			const response = await get.execute.call(
				createMockExecuteFunction(nodeParameters),
				items,
				'appYoLbase',
				'tblltable',
			);

			expect(transport.apiRequest).toHaveBeenCalledWith(
				'GET',
				'appYoLbase/tblltable/recXXX',
				{},
				{ returnFieldsByFieldId: true },
			);

			expect(response[0].json).toEqual({
				id: 'recXXX',
				fld1234: 'John Doe',
				fld5678: 'john@example.com',
			});
		});
	});

	describe('Search operation with returnFieldsByFieldId', () => {
		it('should request fields by ID when returnFieldsByFieldId is enabled', async () => {
			const nodeParameters = {
				operation: 'search',
				returnAll: true,
				returnFieldsByFieldId: true,
				filterByFormula: '',
				sort: {},
				options: {},
			};

			const items = [
				{
					json: {},
				},
			];

			await search.execute.call(
				createMockExecuteFunction(nodeParameters),
				items,
				'appYoLbase',
				'tblltable',
			);

			expect(transport.apiRequestAllItems).toHaveBeenCalledWith(
				'GET',
				'appYoLbase/tblltable',
				{},
				{ returnFieldsByFieldId: true },
			);
		});
	});

	describe('Edge cases and special characters', () => {
		it('should handle field names with special characters', async () => {
			// Override the mock for this test
			(transport.getFieldNamesAndIds as jest.Mock).mockResolvedValueOnce(
				new Map([
					['Name (Primary)', 'fld1234'],
					['Email @ Work', 'fld5678'],
					['Status / Progress', 'fld9012'],
					['Cost ($)', 'fldABC'],
				]),
			);

			const nodeParameters = {
				operation: 'create',
				columns: {
					mappingMode: 'defineBelow',
					value: {
						'Name (Primary)': 'John Doe',
						'Email @ Work': 'john@example.com',
						'Status / Progress': 'Active',
						'Cost ($)': 100,
					},
				},
				useFieldIds: true,
				options: {},
			};

			const items = [{ json: {} }];

			await create.execute.call(
				createMockExecuteFunction(nodeParameters),
				items,
				'appYoLbase',
				'tblltable',
			);

			expect(transport.apiRequest).toHaveBeenCalledWith('POST', 'appYoLbase/tblltable', {
				typecast: false,
				fields: {
					fld1234: 'John Doe',
					fld5678: 'john@example.com',
					fld9012: 'Active',
					fldABC: 100,
				},
			});
		});

		it('should handle batch operations with multiple items', async () => {
			const nodeParameters = {
				operation: 'create',
				columns: {
					mappingMode: 'autoMapInputData',
				},
				useFieldIds: true,
				options: {},
			};

			const items = [
				{
					json: {
						Name: 'John Doe',
						Email: 'john@example.com',
					},
				},
				{
					json: {
						Name: 'Jane Smith',
						Email: 'jane@example.com',
					},
				},
				{
					json: {
						Name: 'Bob Johnson',
						Email: 'bob@example.com',
					},
				},
			];

			await create.execute.call(
				createMockExecuteFunction(nodeParameters),
				items,
				'appYoLbase',
				'tblltable',
			);

			// Should call getFieldNamesAndIds only once
			expect(transport.getFieldNamesAndIds).toHaveBeenCalledTimes(1);

			// Should make 3 API calls, one for each item
			expect(transport.apiRequest).toHaveBeenCalledTimes(3);

			// Verify each call used field IDs
			expect(transport.apiRequest).toHaveBeenNthCalledWith(1, 'POST', 'appYoLbase/tblltable', {
				typecast: false,
				fields: {
					fld1234: 'John Doe',
					fld5678: 'john@example.com',
				},
			});

			expect(transport.apiRequest).toHaveBeenNthCalledWith(2, 'POST', 'appYoLbase/tblltable', {
				typecast: false,
				fields: {
					fld1234: 'Jane Smith',
					fld5678: 'jane@example.com',
				},
			});
		});

		it('should handle mixed field mappings (some mapped, some not)', async () => {
			// Override the mock to only have partial mappings
			(transport.getFieldNamesAndIds as jest.Mock).mockResolvedValueOnce(
				new Map([
					['Name', 'fld1234'],
					// Email is not in the mapping
				]),
			);

			const nodeParameters = {
				operation: 'create',
				columns: {
					mappingMode: 'defineBelow',
					value: {
						Name: 'John Doe',
						Email: 'john@example.com',
						UnknownField: 'some value',
					},
				},
				useFieldIds: true,
				options: {},
			};

			const items = [{ json: {} }];

			await create.execute.call(
				createMockExecuteFunction(nodeParameters),
				items,
				'appYoLbase',
				'tblltable',
			);

			expect(transport.apiRequest).toHaveBeenCalledWith('POST', 'appYoLbase/tblltable', {
				typecast: false,
				fields: {
					fld1234: 'John Doe',
					Email: 'john@example.com', // Kept as field name
					UnknownField: 'some value', // Kept as field name
				},
			});
		});

		it('should handle error when field mapping fails', async () => {
			// Make getFieldNamesAndIds throw an error
			(transport.getFieldNamesAndIds as jest.Mock).mockRejectedValueOnce(
				new Error('Failed to fetch field mappings'),
			);

			const nodeParameters = {
				operation: 'create',
				columns: {
					mappingMode: 'defineBelow',
					value: {
						Name: 'John Doe',
					},
				},
				useFieldIds: true,
				options: {},
			};

			const items = [{ json: {} }];
			const executeFn = createMockExecuteFunction(nodeParameters);
			executeFn.continueOnFail = jest.fn().mockReturnValue(false);

			await expect(
				create.execute.call(executeFn, items, 'appYoLbase', 'tblltable'),
			).rejects.toThrow('Failed to fetch field mappings');
		});
	});
});
