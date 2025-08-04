'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_assert_1 = __importDefault(require('node:assert'));
const node_stream_1 = require('node:stream');
const webhook_last_node_response_extractor_1 = require('../webhook-last-node-response-extractor');
describe('extractWebhookLastNodeResponse', () => {
	let context;
	let lastNodeTaskData;
	let binaryDataService;
	beforeEach(() => {
		context = (0, jest_mock_extended_1.mock)();
		lastNodeTaskData = (0, jest_mock_extended_1.mock)();
		binaryDataService = (0, jest_mock_extended_1.mock)();
		di_1.Container.set(n8n_core_1.BinaryDataService, binaryDataService);
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
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
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
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
				context,
				'firstEntryJson',
				lastNodeTaskData,
			);
			(0, node_assert_1.default)(!result.ok);
			expect(result.error).toBeInstanceOf(n8n_workflow_1.OperationalError);
		});
		it('should extract specific property when responsePropertyName is set', async () => {
			const jsonData = { foo: 'bar', nested: { value: 'test' } };
			lastNodeTaskData.data = {
				main: [[{ json: jsonData }]],
			};
			context.evaluateSimpleWebhookDescriptionExpression
				.mockReturnValueOnce('nested.value')
				.mockReturnValueOnce(undefined);
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
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
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
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
			const binaryData = {
				data: Buffer.from('test binary data').toString(n8n_workflow_1.BINARY_ENCODING),
				mimeType: 'text/plain',
			};
			const nodeExecutionData = {
				json: {},
				binary: { data: binaryData },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};
			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue('data');
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
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
			const mockStream = new node_stream_1.Readable();
			binaryDataService.getAsStream.mockResolvedValue(mockStream);
			const binaryData = {
				id: 'binary-123',
				mimeType: 'image/jpeg',
				data: '',
			};
			const nodeExecutionData = {
				json: {},
				binary: { data: binaryData },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};
			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue('data');
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
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
			(0, node_assert_1.default)(binaryDataService.getAsStream.mock.calls[0][0] === 'binary-123');
		});
		it('should return error when no item found', async () => {
			lastNodeTaskData.data = {
				main: [[]],
			};
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);
			(0, node_assert_1.default)(!result.ok);
			expect(result.error).toBeInstanceOf(n8n_workflow_1.OperationalError);
			expect(result.error.message).toBe('No item was found to return');
		});
		it('should return error when no binary data found', async () => {
			const nodeExecutionData = {
				json: { foo: 'bar' },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);
			(0, node_assert_1.default)(!result.ok);
			expect(result.error).toBeInstanceOf(n8n_workflow_1.OperationalError);
			expect(result.error.message).toBe('No binary data was found to return');
		});
		it('should return error when responseBinaryPropertyName is undefined', async () => {
			const nodeExecutionData = {
				json: {},
				binary: { data: { data: 'test', mimeType: 'text/plain' } },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};
			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue(undefined);
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);
			(0, node_assert_1.default)(!result.ok);
			expect(result.error).toBeInstanceOf(n8n_workflow_1.OperationalError);
			expect(result.error.message).toBe("No 'responseBinaryPropertyName' is set");
		});
		it('should return error when responseBinaryPropertyName is not a string', async () => {
			const nodeExecutionData = {
				json: {},
				binary: { data: { data: 'test', mimeType: 'text/plain' } },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};
			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue(123);
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);
			(0, node_assert_1.default)(!result.ok);
			expect(result.error).toBeInstanceOf(n8n_workflow_1.OperationalError);
			expect(result.error.message).toBe("'responseBinaryPropertyName' is not a string");
		});
		it('should return error when specified binary property does not exist', async () => {
			const nodeExecutionData = {
				json: {},
				binary: { otherProperty: { data: 'test', mimeType: 'text/plain' } },
			};
			lastNodeTaskData.data = {
				main: [[nodeExecutionData]],
			};
			context.evaluateSimpleWebhookDescriptionExpression.mockReturnValue('nonExistentProperty');
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
				context,
				'firstEntryBinary',
				lastNodeTaskData,
			);
			(0, node_assert_1.default)(!result.ok);
			expect(result.error).toBeInstanceOf(n8n_workflow_1.OperationalError);
			expect(result.error.message).toBe(
				"The binary property 'nonExistentProperty' which should be returned does not exist",
			);
		});
	});
	describe('responseDataType: noData', () => {
		it('should return undefined body and contentType', async () => {
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
				context,
				'noData',
				lastNodeTaskData,
			);
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
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
				context,
				'allEntries',
				lastNodeTaskData,
			);
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
			const result = await (0,
			webhook_last_node_response_extractor_1.extractWebhookLastNodeResponse)(
				context,
				'allEntries',
				lastNodeTaskData,
			);
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
//# sourceMappingURL=webhook-last-node-response-extractor.test.js.map
