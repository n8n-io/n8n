import * as get from '../../../../v2/actions/record/get.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function (method: string) {
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
		downloadRecordAttachments: jest.fn(async function () {
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
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', 'appYoLbase/tblltable/recXXX');

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

	afterEach(() => jest.clearAllMocks());

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
