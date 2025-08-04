'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const promises_1 = require('stream/promises');
const webhook_helpers_1 = require('../webhook-helpers');
jest.mock('stream/promises', () => ({
	finished: jest.fn(),
}));
describe('autoDetectResponseMode', () => {
	let workflow;
	beforeEach(() => {
		workflow = (0, jest_mock_extended_1.mock)();
		workflow.nodes = {};
	});
	test('should return hostedChat when start node is CHAT_TRIGGER_NODE_TYPE, method is POST, and public is true', () => {
		const workflowStartNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.CHAT_TRIGGER_NODE_TYPE,
			parameters: { options: { responseMode: 'responseNodes' } },
		});
		const result = (0, webhook_helpers_1.autoDetectResponseMode)(
			workflowStartNode,
			workflow,
			'POST',
		);
		expect(result).toBe('hostedChat');
	});
	test('should return undefined if start node is WAIT_NODE_TYPE with resume not equal to form', () => {
		const workflowStartNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.WAIT_NODE_TYPE,
			parameters: { resume: 'webhook' },
		});
		const result = (0, webhook_helpers_1.autoDetectResponseMode)(
			workflowStartNode,
			workflow,
			'POST',
		);
		expect(result).toBeUndefined();
	});
	test('should return responseNode when start node is FORM_NODE_TYPE and method is POST', () => {
		const workflowStartNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.FORM_NODE_TYPE,
			name: 'startNode',
			parameters: {},
		});
		workflow.getChildNodes.mockReturnValue(['childNode']);
		workflow.nodes.childNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.WAIT_NODE_TYPE,
			parameters: { resume: 'form' },
			disabled: false,
		});
		const result = (0, webhook_helpers_1.autoDetectResponseMode)(
			workflowStartNode,
			workflow,
			'POST',
		);
		expect(result).toBe('responseNode');
	});
	test('should return formPage when start node is FORM_NODE_TYPE and method is POST and there is a following FORM_NODE_TYPE node', () => {
		const workflowStartNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.FORM_NODE_TYPE,
			name: 'startNode',
			parameters: {},
		});
		workflow.getChildNodes.mockReturnValue(['childNode']);
		workflow.nodes.childNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.FORM_NODE_TYPE,
			parameters: {
				operation: 'completion',
			},
			disabled: false,
		});
		const result = (0, webhook_helpers_1.autoDetectResponseMode)(
			workflowStartNode,
			workflow,
			'POST',
		);
		expect(result).toBe('formPage');
	});
	test('should return undefined when start node is FORM_NODE_TYPE with no other form child nodes', () => {
		const workflowStartNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.FORM_NODE_TYPE,
			name: 'startNode',
			parameters: {},
		});
		workflow.getChildNodes.mockReturnValue([]);
		const result = (0, webhook_helpers_1.autoDetectResponseMode)(
			workflowStartNode,
			workflow,
			'POST',
		);
		expect(result).toBeUndefined();
	});
	test('should return undefined for non-matching node type and method', () => {
		const workflowStartNode = (0, jest_mock_extended_1.mock)({
			type: 'someOtherNodeType',
			parameters: {},
		});
		const result = (0, webhook_helpers_1.autoDetectResponseMode)(
			workflowStartNode,
			workflow,
			'GET',
		);
		expect(result).toBeUndefined();
	});
});
describe('handleFormRedirectionCase', () => {
	test('should return data unchanged if start node is WAIT_NODE_TYPE with resume not equal to form', () => {
		const data = {
			responseCode: 302,
			headers: { location: 'http://example.com' },
		};
		const workflowStartNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.WAIT_NODE_TYPE,
			parameters: { resume: 'webhook' },
		});
		const result = (0, webhook_helpers_1.handleFormRedirectionCase)(data, workflowStartNode);
		expect(result).toEqual(data);
	});
	test('should modify data if start node type matches and responseCode is a redirect', () => {
		const data = {
			responseCode: 302,
			headers: { location: 'http://example.com' },
		};
		const workflowStartNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.FORM_NODE_TYPE,
			parameters: {},
		});
		const result = (0, webhook_helpers_1.handleFormRedirectionCase)(data, workflowStartNode);
		expect(result.responseCode).toBe(200);
		expect(result.data).toEqual({ redirectURL: 'http://example.com' });
		expect(result?.headers?.location).toBeUndefined();
	});
	test('should not modify data if location header is missing', () => {
		const data = { responseCode: 302, headers: {} };
		const workflowStartNode = (0, jest_mock_extended_1.mock)({
			type: n8n_workflow_1.FORM_NODE_TYPE,
			parameters: {},
		});
		const result = (0, webhook_helpers_1.handleFormRedirectionCase)(data, workflowStartNode);
		expect(result).toEqual(data);
	});
});
describe('setupResponseNodePromise', () => {
	const workflowId = 'test-workflow-id';
	const executionId = 'test-execution-id';
	const res = (0, jest_mock_extended_1.mock)();
	const responseCallback = jest.fn();
	const workflowStartNode = (0, jest_mock_extended_1.mock)();
	const workflow = (0, jest_mock_extended_1.mock)({ id: workflowId });
	const binaryDataService = (0, backend_test_utils_1.mockInstance)(n8n_core_1.BinaryDataService);
	const errorReporter = (0, backend_test_utils_1.mockInstance)(n8n_core_1.ErrorReporter);
	const logger = (0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	let responsePromise;
	beforeEach(() => {
		jest.resetAllMocks();
		responsePromise = (0, n8n_workflow_1.createDeferredPromise)();
		res.header.mockReturnValue(res);
		res.end.mockReturnValue(res);
	});
	test('should handle regular response object', async () => {
		(0, webhook_helpers_1.setupResponseNodePromise)(
			responsePromise,
			res,
			responseCallback,
			workflowStartNode,
			executionId,
			workflow,
		);
		responsePromise.resolve({
			body: { data: 'test data' },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
		await new Promise(process.nextTick);
		expect(responseCallback).toHaveBeenCalledWith(null, {
			data: { data: 'test data' },
			headers: { 'content-type': 'application/json' },
			responseCode: 200,
		});
		expect(res.end).toHaveBeenCalled();
	});
	test('should handle binary data with ID', async () => {
		const mockStream = (0, jest_mock_extended_1.mock)();
		binaryDataService.getAsStream.mockResolvedValue(mockStream);
		(0, webhook_helpers_1.setupResponseNodePromise)(
			responsePromise,
			res,
			responseCallback,
			workflowStartNode,
			executionId,
			workflow,
		);
		responsePromise.resolve({
			body: { binaryData: { id: 'binary-123' } },
			headers: { 'content-type': 'image/jpeg' },
			statusCode: 200,
		});
		await new Promise(process.nextTick);
		expect(binaryDataService.getAsStream).toHaveBeenCalledWith('binary-123');
		expect(res.header).toHaveBeenCalledWith({ 'content-type': 'image/jpeg' });
		expect(mockStream.pipe).toHaveBeenCalledWith(res, { end: false });
		expect(promises_1.finished).toHaveBeenCalledWith(mockStream);
		expect(responseCallback).toHaveBeenCalledWith(null, { noWebhookResponse: true });
	});
	test('should handle buffer response', async () => {
		(0, webhook_helpers_1.setupResponseNodePromise)(
			responsePromise,
			res,
			responseCallback,
			workflowStartNode,
			executionId,
			workflow,
		);
		const buffer = Buffer.from('test buffer');
		responsePromise.resolve({
			body: buffer,
			headers: { 'content-type': 'text/plain' },
			statusCode: 200,
		});
		await new Promise(process.nextTick);
		expect(res.header).toHaveBeenCalledWith({ 'content-type': 'text/plain' });
		expect(res.end).toHaveBeenCalledWith(buffer);
		expect(responseCallback).toHaveBeenCalledWith(null, { noWebhookResponse: true });
	});
	test('should handle errors properly', async () => {
		(0, webhook_helpers_1.setupResponseNodePromise)(
			responsePromise,
			res,
			responseCallback,
			workflowStartNode,
			executionId,
			workflow,
		);
		const error = new Error('Test error');
		responsePromise.reject(error);
		await new Promise(process.nextTick);
		expect(errorReporter.error).toHaveBeenCalledWith(error);
		expect(logger.error).toHaveBeenCalledWith(
			`Error with Webhook-Response for execution "${executionId}": "${error.message}"`,
			{ executionId, workflowId },
		);
		expect(responseCallback).toHaveBeenCalledWith(error, {});
	});
});
describe('handleHostedChatResponse', () => {
	it('should send executionStarted: true and executionId when responseMode is hostedChat and didSendResponse is false', async () => {
		const res = {
			send: jest.fn(),
			end: jest.fn(),
		};
		const executionId = 'testExecutionId';
		const didSendResponse = false;
		const responseMode = 'hostedChat';
		res.send.mockImplementation((data) => {
			expect(data).toEqual({ executionStarted: true, executionId });
		});
		const result = (0, webhook_helpers_1.handleHostedChatResponse)(
			res,
			responseMode,
			didSendResponse,
			executionId,
		);
		expect(res.send).toHaveBeenCalled();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(res.end).toHaveBeenCalled();
		expect(result).toBe(true);
	});
	it('should not send response when responseMode is not hostedChat', () => {
		const res = {
			send: jest.fn(),
			end: jest.fn(),
		};
		const executionId = 'testExecutionId';
		const didSendResponse = false;
		const responseMode = 'responseNode';
		const result = (0, webhook_helpers_1.handleHostedChatResponse)(
			res,
			responseMode,
			didSendResponse,
			executionId,
		);
		expect(res.send).not.toHaveBeenCalled();
		expect(res.end).not.toHaveBeenCalled();
		expect(result).toBe(false);
	});
	it('should not send response when didSendResponse is true', () => {
		const res = {
			send: jest.fn(),
			end: jest.fn(),
		};
		const executionId = 'testExecutionId';
		const didSendResponse = true;
		const responseMode = 'hostedChat';
		const result = (0, webhook_helpers_1.handleHostedChatResponse)(
			res,
			responseMode,
			didSendResponse,
			executionId,
		);
		expect(res.send).not.toHaveBeenCalled();
		expect(res.end).not.toHaveBeenCalled();
		expect(result).toBe(true);
	});
});
describe('prepareExecutionData', () => {
	const workflowStartNode = (0, jest_mock_extended_1.mock)({ name: 'Start' });
	const webhookResultData = {
		workflowData: [[{ json: { data: 'test' } }]],
	};
	const workflowData = (0, jest_mock_extended_1.mock)({
		id: 'workflow1',
		pinData: { nodeA: [{ json: { pinned: true } }] },
	});
	test('should create new execution data when not provided', () => {
		const { runExecutionData, pinData } = (0, webhook_helpers_1.prepareExecutionData)(
			'manual',
			workflowStartNode,
			webhookResultData,
			undefined,
		);
		const nodeExecuteData = runExecutionData.executionData?.nodeExecutionStack?.[0];
		expect(nodeExecuteData).toBeDefined();
		expect(nodeExecuteData?.node).toBe(workflowStartNode);
		expect(nodeExecuteData?.data.main).toBe(webhookResultData.workflowData);
		expect(pinData).toBeUndefined();
	});
	test('should update existing runExecutionData when executionId is defined', () => {
		const executionId = 'test-execution-id';
		const nodeExecutionStack = [
			{
				node: workflowStartNode,
				data: { main: [[{ json: { oldData: true } }]] },
				source: null,
			},
		];
		const existingRunExecutionData = {
			startData: {},
			resultData: { runData: {} },
			executionData: {
				contextData: {},
				nodeExecutionStack,
				waitingExecution: {},
			},
		};
		(0, webhook_helpers_1.prepareExecutionData)(
			'manual',
			workflowStartNode,
			webhookResultData,
			existingRunExecutionData,
			undefined,
			undefined,
			executionId,
		);
		expect(nodeExecutionStack[0]?.data.main).toBe(webhookResultData.workflowData);
	});
	test('should set destination node when provided', () => {
		const { runExecutionData } = (0, webhook_helpers_1.prepareExecutionData)(
			'manual',
			workflowStartNode,
			webhookResultData,
			undefined,
			{},
			'targetNode',
		);
		expect(runExecutionData.startData?.destinationNode).toBe('targetNode');
	});
	test('should update execution data with execution data merge', () => {
		const runExecutionDataMerge = {
			resultData: {
				error: { message: 'Test error' },
			},
		};
		const { runExecutionData } = (0, webhook_helpers_1.prepareExecutionData)(
			'manual',
			workflowStartNode,
			webhookResultData,
			undefined,
			runExecutionDataMerge,
		);
		expect(runExecutionData.resultData.error).toEqual({ message: 'Test error' });
	});
	test('should set pinData when execution mode is manual', () => {
		const { runExecutionData, pinData } = (0, webhook_helpers_1.prepareExecutionData)(
			'manual',
			workflowStartNode,
			webhookResultData,
			undefined,
			{},
			undefined,
			undefined,
			workflowData,
		);
		expect(pinData).toBe(workflowData.pinData);
		expect(runExecutionData.resultData.pinData).toBe(workflowData.pinData);
	});
	test('should not set pinData when execution mode is not manual or evaluation', () => {
		const { runExecutionData, pinData } = (0, webhook_helpers_1.prepareExecutionData)(
			'webhook',
			workflowStartNode,
			webhookResultData,
			undefined,
			{},
			undefined,
			undefined,
			workflowData,
		);
		expect(pinData).toBeUndefined();
		expect(runExecutionData.resultData.pinData).toBeUndefined();
	});
});
//# sourceMappingURL=webhook-helpers.test.js.map
