import * as create from '../../../../v2/actions/record/create.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {};
		}),
	};
});

describe('Test AirtableV2, create operation', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should create a record, autoMapInputData', async () => {
		const nodeParameters = {
			operation: 'create',
			columns: {
				mappingMode: 'autoMapInputData',
				value: {
					bar: 'bar 1',
					foo: 'foo 1',
					spam: 'eggs',
				},
				matchingColumns: [],
				schema: [
					{
						id: 'foo',
						displayName: 'foo',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
					},
					{
						id: 'bar',
						displayName: 'bar',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
					},
					{
						id: 'spam',
						displayName: 'spam',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
					},
				],
			},
			options: {
				typecast: true,
				ignoreFields: 'spam',
			},
		};

		const items = [
			{
				json: {
					foo: 'foo 1',
					spam: 'eggs',
					bar: 'bar 1',
				},
			},
			{
				json: {
					foo: 'foo 2',
					spam: 'eggs',
					bar: 'bar 2',
				},
			},
		];

		await create.execute.call(
			createMockExecuteFunction(nodeParameters),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', 'appYoLbase/tblltable', {
			fields: {
				foo: 'foo 1',
				bar: 'bar 1',
			},
			typecast: true,
		});
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', 'appYoLbase/tblltable', {
			fields: {
				foo: 'foo 2',
				bar: 'bar 2',
			},
			typecast: true,
		});
	});

	it('should create a record, defineBelow', async () => {
		const nodeParameters = {
			operation: 'create',
			columns: {
				mappingMode: 'defineBelow',
				value: {
					bar: 'bar 1',
					foo: 'foo 1',
				},
				matchingColumns: [],
				schema: [
					{
						id: 'foo',
						displayName: 'foo',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
					},
					{
						id: 'bar',
						displayName: 'bar',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
					},
				],
			},
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

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', 'appYoLbase/tblltable', {
			fields: {
				foo: 'foo 1',
				bar: 'bar 1',
			},
			typecast: false,
		});
	});

	it('should skip validation if typecast option is true', async () => {
		const nodeParameters = {
			operation: 'create',
			columns: {
				mappingMode: 'defineBelow',
				value: {
					bar: 'bar 1',
					foo: 'foo 1',
				},
				matchingColumns: [],
				schema: [
					{
						id: 'foo',
						displayName: 'foo',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
					},
					{
						id: 'bar',
						displayName: 'bar',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
					},
				],
			},
			options: {
				typecast: true,
			},
		};

		const mockExecuteFunctions = createMockExecuteFunction(nodeParameters);
		await create.execute.call(mockExecuteFunctions, [{ json: {} }], 'appYoLbase', 'tblltable');

		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('columns.value', 0, [], {
			skipValidation: true,
		});

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', 'appYoLbase/tblltable', {
			fields: {
				foo: 'foo 1',
				bar: 'bar 1',
			},
			typecast: true,
		});
	});
});
