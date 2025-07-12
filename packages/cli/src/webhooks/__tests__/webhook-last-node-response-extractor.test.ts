import { Container } from '@n8n/di';
import { mock, type MockProxy } from 'jest-mock-extended';
import { BinaryDataService } from 'n8n-core';
import type { ITaskData, INodeExecutionData, IBinaryData } from 'n8n-workflow';
import { BINARY_ENCODING, OperationalError } from 'n8n-workflow';
import assert from 'node:assert';
import { Readable } from 'node:stream';

import { extractWebhookLastNodeResponse } from '../webhook-last-node-response-extractor';

import type { WebhookExecutionContext } from '@/webhooks/webhook-execution-context';

describe('extractWebhookLastNodeResponse', () => {
	let context: MockProxy<WebhookExecutionContext>;
	let lastNodeTaskData: MockProxy<ITaskData>;
	let binaryDataService: MockProxy<BinaryDataService>;

	beforeEach(() => {
		context = mock<WebhookExecutionContext>();
		lastNodeTaskData = mock<ITaskData>();
		binaryDataService = mock<BinaryDataService>();

		Container.set(BinaryDataService, binaryDataService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('responseDataType: firstEntryJson', () => {
		it('should return first entry JSON data', async () => {
			const jsonData = { foo: 'bar', test: 123 };
			lastNodeTaskData.data = {
				main: [[{ json: jsonData }]],
			};

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryJson',
				lastNodeTaskData,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'static',
					body: jsonData,
					contentType: undefined,
				},
			});
		});

		it('should return error when no item to return', async () => {
			lastNodeTaskData.data = {
				main: [[]],
			};

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryJson',
				lastNodeTaskData,
			);

			assert(!result.ok);
			expect(result.error).toBeInstanceOf(OperationalError);
		});

		it('should extract specific property when responsePropertyName is set', async () => {
			const jsonData = { foo: 'bar', nested: { value: 'test' } };
			lastNodeTaskData.data = {
				main: [[{ json: jsonData }]],
			};

			context.evaluateSimpleWebhookDescriptionExpression
				.mockReturnValueOnce('nested.value')
				.mockReturnValueOnce(undefined);

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryJson',
				lastNodeTaskData,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'static',
					body: 'test',
					contentType: undefined,
				},
			});
		});

		it('should set content type when responseContentType is provided', async () => {
			const jsonData = { foo: 'bar' };
			lastNodeTaskData.data = {
				main: [[{ json: jsonData }]],
			};

			context.evaluateSimpleWebhookDescriptionExpression
				.mockReturnValueOnce(undefined)
				.mockReturnValueOnce('application/xml');

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryJson',
				lastNodeTaskData,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'static',
					body: jsonData,
					contentType: 'application/xml',
				},
			});
		});
	});

	describe('responseDataType: firstEntryBinary', () => {
		it('should return binary data as buffer when no ID is present', async () => {
			const binaryData: IBinaryData = {
				data: Buffer.from('test binary data').toString(BINARY_ENCODING),
				mimeType: 'text/plain',
			};
			const nodeExecutionData: INodeExecutionData = {
				json: {},
				binary: { data: binaryData },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};

			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue('data');

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'static',
					body: Buffer.from('test binary data'),
					contentType: 'text/plain',
				},
			});
		});

		it('should return binary data as stream when ID is present', async () => {
			const mockStream = new Readable();
			binaryDataService.getAsStream.mockResolvedValue(mockStream);

			const binaryData: IBinaryData = {
				id: 'binary-123',
				mimeType: 'image/jpeg',
				data: '',
			};
			const nodeExecutionData: INodeExecutionData = {
				json: {},
				binary: { data: binaryData },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};

			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue('data');

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'stream',
					stream: mockStream,
					contentType: 'image/jpeg',
				},
			});
			assert(binaryDataService.getAsStream.mock.calls[0][0] === 'binary-123');
		});

		it('should return error when no item found', async () => {
			lastNodeTaskData.data = {
				main: [[]],
			};

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);

			assert(!result.ok);
			expect(result.error).toBeInstanceOf(OperationalError);
			expect(result.error.message).toBe('No item was found to return');
		});

		it('should return error when no binary data found', async () => {
			const nodeExecutionData: INodeExecutionData = {
				json: { foo: 'bar' },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);

			assert(!result.ok);
			expect(result.error).toBeInstanceOf(OperationalError);
			expect(result.error.message).toBe('No binary data was found to return');
		});

		it('should return error when responseBinaryPropertyName is undefined', async () => {
			const nodeExecutionData: INodeExecutionData = {
				json: {},
				binary: { data: { data: 'test', mimeType: 'text/plain' } },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};

			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue(undefined);

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);

			assert(!result.ok);
			expect(result.error).toBeInstanceOf(OperationalError);
			expect(result.error.message).toBe("No 'responseBinaryPropertyName' is set");
		});

		it('should return error when responseBinaryPropertyName is not a string', async () => {
			const nodeExecutionData: INodeExecutionData = {
				json: {},
				binary: { data: { data: 'test', mimeType: 'text/plain' } },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};

			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue(123);

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);

			assert(!result.ok);
			expect(result.error).toBeInstanceOf(OperationalError);
			expect(result.error.message).toBe("'responseBinaryPropertyName' is not a string");
		});

		it('should return error when specified binary property does not exist', async () => {
			const nodeExecutionData: INodeExecutionData = {
				json: {},
				binary: { otherProperty: { data: 'test', mimeType: 'text/plain' } },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};

			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue('nonExistentProperty');

			const result = await extractWebhookLastNodeResponse(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);

			assert(!result.ok);
			expect(result.error).toBeInstanceOf(OperationalError);
			expect(result.error.message).toBe(
				"The binary property 'nonExistentProperty' which should be returned does not exist",
			);
		});
	});

	describe('responseDataType: noData', () => {
		it('should return undefined body and contentType', async () => {
			const result = await extractWebhookLastNodeResponse(context, 'noData', lastNodeTaskData);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'static',
					body: undefined,
					contentType: undefined,
				},
			});
		});
	});

	describe('responseDataType: default (allEntries)', () => {
		it('should return all entries as JSON array', async () => {
			const jsonData1 = { foo: 'bar' };
			const jsonData2 = { test: 123 };
			const jsonData3 = { nested: { value: 'test' } };
			lastNodeTaskData.data = {
				main: [[{ json: jsonData1 }, { json: jsonData2 }, { json: jsonData3 }]],
			};

			const result = await extractWebhookLastNodeResponse(context, 'allEntries', lastNodeTaskData);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'static',
					body: [jsonData1, jsonData2, jsonData3],
					contentType: undefined,
				},
			});
		});

		it('should return empty array when no entries', async () => {
			lastNodeTaskData.data = {
				main: [[]],
			};

			const result = await extractWebhookLastNodeResponse(context, 'allEntries', lastNodeTaskData);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'static',
					body: [],
					contentType: undefined,
				},
			});
		});
	});
});
