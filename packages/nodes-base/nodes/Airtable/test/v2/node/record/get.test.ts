import { requestPath } from 'n8n-workflow';
import * as get from '../../../../v2/actions/record/get.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: vi.fn(async function (method: string) {
			if (method === 'GET') {
				return {
					id: 'recXXX',
					fields: {
						foo: 'foo 1',
						bar: 'bar 1',
					},
				};
			}
		}),
		downloadRecordAttachments: vi.fn(async function () {
			return [
				{
					json: {
						id: 'recXXX',
						fields: {
							foo: 'foo 1',
							bar: 'bar 1',
							attachment: [{ url: 'http://example.com/file.png' }],
						},
					},
					binary: { attachment_0: { data: 'binary-data' } },
				},
			];
		}),
	};
});

describe('Test AirtableV2, get operation', () => {
	it('should get a record and with nested fields structure for v2.2', async () => {
		const nodeParameters = {
			operation: 'get',
			id: 'recXXX',
			options: {},
		};

		const items = [
			{
				json: {},
			},
		];

		const responce = await get.execute.call(
			createMockExecuteFunction(nodeParameters),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'GET',
			requestPath`appYoLbase/tblltable/recXXX`,
		);

		expect(responce).toEqual([
			{
				json: {
					id: 'recXXX',
					fields: {
						foo: 'foo 1',
						bar: 'bar 1',
					},
				},
				pairedItem: {
					item: 0,
				},
			},
		]);
	});

	it('should encode the table and record ID in the request path', async () => {
		await get.execute.call(
			createMockExecuteFunction({ operation: 'get', id: 'rec/XXX', options: {} }),
			[{ json: {} }],
			'appYoLbase',
			'tbl/table',
		);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'GET',
			expect.objectContaining({ value: 'appYoLbase/tbl%2Ftable/rec%2FXXX' }),
		);
	});

	it.each([
		['record ID', 'appYoLbase', 'tblltable', '..'],
		['table ID', 'appYoLbase', '..', 'recXXX'],
		['base ID', '..', 'tblltable', 'recXXX'],
	])('should reject a dot-segment %s before the request', async (_, base, table, id) => {
		await expect(
			get.execute.call(
				createMockExecuteFunction({ operation: 'get', id, options: {} }),
				[{ json: {} }],
				base,
				table,
			),
		).rejects.toThrow('Invalid identifier');

		expect(transport.apiRequest).not.toHaveBeenCalled();
	});

	afterEach(() => vi.clearAllMocks());

	it('should get a record with attachments and nested fields structure for v2.2', async () => {
		const nodeParameters = {
			operation: 'get',
			id: 'recXXX',
			options: { downloadFields: ['attachment'] },
		};

		const items = [{ json: {} }];

		const result = await get.execute.call(
			createMockExecuteFunction(nodeParameters),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(transport.downloadRecordAttachments).toHaveBeenCalledTimes(1);
		expect(result).toEqual([
			{
				json: {
					id: 'recXXX',
					fields: {
						foo: 'foo 1',
						bar: 'bar 1',
						attachment: [{ url: 'http://example.com/file.png' }],
					},
				},
				binary: { attachment_0: { data: 'binary-data' } },
			},
		]);
	});

	it('should get a record with attachments and flatten output for v2', async () => {
		const nodeParameters = {
			operation: 'get',
			id: 'recXXX',
			options: { downloadFields: ['attachment'] },
		};

		const items = [{ json: {} }];

		const result = await get.execute.call(
			createMockExecuteFunction(nodeParameters, 2),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(transport.downloadRecordAttachments).toHaveBeenCalledTimes(1);
		expect(result).toEqual([
			{
				json: {
					id: 'recXXX',
					foo: 'foo 1',
					bar: 'bar 1',
					attachment: [{ url: 'http://example.com/file.png' }],
				},
				binary: { attachment_0: { data: 'binary-data' } },
			},
		]);
	});

	it('should get a record and flatten output for v2', async () => {
		const nodeParameters = {
			operation: 'get',
			id: 'recXXX',
			options: {},
		};

		const items = [{ json: {} }];

		const result = await get.execute.call(
			createMockExecuteFunction(nodeParameters, 2),
			items,
			'appYoLbase',
			'tblltable',
		);

		expect(result).toEqual([
			{
				json: {
					id: 'recXXX',
					foo: 'foo 1',
					bar: 'bar 1',
				},
				pairedItem: {
					item: 0,
				},
			},
		]);
	});
});
