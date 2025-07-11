import { Container } from '@n8n/di';
import { mock, type MockProxy } from 'jest-mock-extended';
import { BinaryDataService } from 'n8n-core';
import type {
	INode,
	ITaskData,
	IWebhookData,
	Workflow,
	IWorkflowDataProxyAdditionalKeys,
	INodeExecutionData,
	IBinaryData,
	Expression,
} from 'n8n-workflow';
import { BINARY_ENCODING, OperationalError } from 'n8n-workflow';
import assert from 'node:assert';
import { Readable } from 'node:stream';

import { extractWebhookLastNodeResponse } from '../webhook-last-node-response-extractor';

describe('extractWebhookLastNodeResponse', () => {
	let mockWorkflow: MockProxy<Workflow>;
	let mockWorkflowStartNode: MockProxy<INode>;
	let mockWebhookData: MockProxy<IWebhookData>;
	let mockLastNodeRunData: MockProxy<ITaskData>;
	let mockBinaryDataService: MockProxy<BinaryDataService>;
	let mockAdditionalKeys: MockProxy<IWorkflowDataProxyAdditionalKeys>;

	beforeEach(() => {
		mockWorkflow = mock<Workflow>();
		mockWorkflowStartNode = mock<INode>();
		mockWebhookData = mock<IWebhookData>({
			webhookDescription: {
				responsePropertyName: undefined,
				responseContentType: undefined,
				responseBinaryPropertyName: undefined,
			},
		});
		mockLastNodeRunData = mock<ITaskData>();
		mockBinaryDataService = mock<BinaryDataService>();
		mockAdditionalKeys = mock<IWorkflowDataProxyAdditionalKeys>();

		mockWorkflow.expression = mock<Expression>({
			getSimpleParameterValue: jest.fn(),
		});

		Container.set(BinaryDataService, mockBinaryDataService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('responseDataType: firstEntryJson', () => {
		it('should return first entry JSON data', async () => {
			const jsonData = { foo: 'bar', test: 123 };
			mockLastNodeRunData.data = {
				main: [[{ json: jsonData }]],
			};

			const result = await extractWebhookLastNodeResponse(
				'firstEntryJson',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'nonstream',
					body: jsonData,
					contentType: undefined,
				},
			});
		});

		it('should return error when no item to return', async () => {
			mockLastNodeRunData.data = {
				main: [[]],
			};

			const result = await extractWebhookLastNodeResponse(
				'firstEntryJson',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			assert(!result.ok);
			expect(result.error).toBeInstanceOf(OperationalError);
		});

		it('should extract specific property when responsePropertyName is set', async () => {
			const jsonData = { foo: 'bar', nested: { value: 'test' } };
			mockLastNodeRunData.data = {
				main: [[{ json: jsonData }]],
			};

			mockWebhookData.webhookDescription.responsePropertyName = 'nested.value';
			(mockWorkflow.expression.getSimpleParameterValue as jest.Mock)
				.mockReturnValueOnce('nested.value')
				.mockReturnValueOnce(undefined);

			const result = await extractWebhookLastNodeResponse(
				'firstEntryJson',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'nonstream',
					body: 'test',
					contentType: undefined,
				},
			});
		});

		it('should set content type when responseContentType is provided', async () => {
			const jsonData = { foo: 'bar' };
			mockLastNodeRunData.data = {
				main: [[{ json: jsonData }]],
			};

			mockWebhookData.webhookDescription.responseContentType = 'application/xml';
			(mockWorkflow.expression.getSimpleParameterValue as jest.Mock)
				.mockReturnValueOnce(undefined)
				.mockReturnValueOnce('application/xml');

			const result = await extractWebhookLastNodeResponse(
				'firstEntryJson',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'nonstream',
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
			mockLastNodeRunData.data = {
				main: [[nodeExecutionData]],
			};

			mockWebhookData.webhookDescription.responseBinaryPropertyName = 'data';
			(mockWorkflow.expression.getSimpleParameterValue as jest.Mock).mockReturnValue('data');

			const result = await extractWebhookLastNodeResponse(
				'firstEntryBinary',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'nonstream',
					body: Buffer.from('test binary data'),
					contentType: 'text/plain',
				},
			});
		});

		it('should return binary data as stream when ID is present', async () => {
			const mockStream = new Readable();
			mockBinaryDataService.getAsStream.mockResolvedValue(mockStream);

			const binaryData: IBinaryData = {
				id: 'binary-123',
				mimeType: 'image/jpeg',
				data: '',
			};
			const nodeExecutionData: INodeExecutionData = {
				json: {},
				binary: { data: binaryData },
			};
			mockLastNodeRunData.data = {
				main: [[nodeExecutionData]],
			};

			mockWebhookData.webhookDescription.responseBinaryPropertyName = 'data';
			(mockWorkflow.expression.getSimpleParameterValue as jest.Mock).mockReturnValue('data');

			const result = await extractWebhookLastNodeResponse(
				'firstEntryBinary',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'stream',
					stream: mockStream,
					contentType: 'image/jpeg',
				},
			});
			assert(mockBinaryDataService.getAsStream.mock.calls[0][0] === 'binary-123');
		});

		it('should return error when no item found', async () => {
			mockLastNodeRunData.data = {
				main: [[]],
			};

			const result = await extractWebhookLastNodeResponse(
				'firstEntryBinary',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			assert(!result.ok);
			expect(result.error).toBeInstanceOf(OperationalError);
			expect(result.error.message).toBe('No item was found to return');
		});

		it('should return error when no binary data found', async () => {
			const nodeExecutionData: INodeExecutionData = {
				json: { foo: 'bar' },
			};
			mockLastNodeRunData.data = {
				main: [[nodeExecutionData]],
			};

			const result = await extractWebhookLastNodeResponse(
				'firstEntryBinary',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
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
			mockLastNodeRunData.data = {
				main: [[nodeExecutionData]],
			};

			(mockWorkflow.expression.getSimpleParameterValue as jest.Mock).mockReturnValue(undefined);

			const result = await extractWebhookLastNodeResponse(
				'firstEntryBinary',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
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
			mockLastNodeRunData.data = {
				main: [[nodeExecutionData]],
			};

			(mockWorkflow.expression.getSimpleParameterValue as jest.Mock).mockReturnValue(123);

			const result = await extractWebhookLastNodeResponse(
				'firstEntryBinary',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
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
			mockLastNodeRunData.data = {
				main: [[nodeExecutionData]],
			};

			(mockWorkflow.expression.getSimpleParameterValue as jest.Mock).mockReturnValue(
				'nonExistentProperty',
			);

			const result = await extractWebhookLastNodeResponse(
				'firstEntryBinary',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
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
			const result = await extractWebhookLastNodeResponse(
				'noData',
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'nonstream',
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
			mockLastNodeRunData.data = {
				main: [[{ json: jsonData1 }, { json: jsonData2 }, { json: jsonData3 }]],
			};

			const result = await extractWebhookLastNodeResponse(
				undefined,
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'nonstream',
					body: [jsonData1, jsonData2, jsonData3],
					contentType: undefined,
				},
			});
		});

		it('should return empty array when no entries', async () => {
			mockLastNodeRunData.data = {
				main: [[]],
			};

			const result = await extractWebhookLastNodeResponse(
				undefined,
				mockLastNodeRunData,
				mockWorkflow,
				mockWorkflowStartNode,
				mockWebhookData,
				'manual',
				mockAdditionalKeys,
			);

			expect(result).toEqual({
				ok: true,
				result: {
					type: 'nonstream',
					body: [],
					contentType: undefined,
				},
			});
		});
	});
});
