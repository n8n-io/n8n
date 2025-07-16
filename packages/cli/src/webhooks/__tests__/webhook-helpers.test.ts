import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type express from 'express';
import { mock, type MockProxy } from 'jest-mock-extended';
import { BinaryDataService, ErrorReporter } from 'n8n-core';
import type {
	Workflow,
	INode,
	IDataObject,
	IWebhookResponseData,
	IDeferredPromise,
	IN8nHttpFullResponse,
	IWorkflowBase,
	IRunExecutionData,
	IExecuteData,
} from 'n8n-workflow';
import { createDeferredPromise, FORM_NODE_TYPE, WAIT_NODE_TYPE } from 'n8n-workflow';
import type { Readable } from 'stream';
import { finished } from 'stream/promises';

import {
	autoDetectResponseMode,
	handleFormRedirectionCase,
	setupResponseNodePromise,
	prepareExecutionData,
} from '../webhook-helpers';
import type { IWebhookResponseCallbackData } from '../webhook.types';

jest.mock('stream/promises', () => ({
	finished: jest.fn(),
}));

describe('autoDetectResponseMode', () => {
	let workflow: MockProxy<Workflow>;

	beforeEach(() => {
		workflow = mock<Workflow>();
		workflow.nodes = {};
	});

	test('should return undefined if start node is WAIT_NODE_TYPE with resume not equal to form', () => {
		const workflowStartNode = mock<INode>({
			type: WAIT_NODE_TYPE,
			parameters: { resume: 'webhook' },
		});
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'POST');
		expect(result).toBeUndefined();
	});

	test('should return responseNode when start node is FORM_NODE_TYPE and method is POST', () => {
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			name: 'startNode',
			parameters: {},
		});
		workflow.getChildNodes.mockReturnValue(['childNode']);
		workflow.nodes.childNode = mock<INode>({
			type: WAIT_NODE_TYPE,
			parameters: { resume: 'form' },
			disabled: false,
		});
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'POST');
		expect(result).toBe('responseNode');
	});

	test('should return formPage when start node is FORM_NODE_TYPE and method is POST and there is a following FORM_NODE_TYPE node', () => {
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			name: 'startNode',
			parameters: {},
		});
		workflow.getChildNodes.mockReturnValue(['childNode']);
		workflow.nodes.childNode = mock<INode>({
			type: FORM_NODE_TYPE,
			parameters: {
				operation: 'completion',
			},
			disabled: false,
		});
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'POST');
		expect(result).toBe('formPage');
	});

	test('should return undefined when start node is FORM_NODE_TYPE with no other form child nodes', () => {
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			name: 'startNode',
			parameters: {},
		});
		workflow.getChildNodes.mockReturnValue([]);
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'POST');
		expect(result).toBeUndefined();
	});

	test('should return undefined for non-matching node type and method', () => {
		const workflowStartNode = mock<INode>({ type: 'someOtherNodeType', parameters: {} });
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'GET');
		expect(result).toBeUndefined();
	});
});

describe('handleFormRedirectionCase', () => {
	test('should return data unchanged if start node is WAIT_NODE_TYPE with resume not equal to form', () => {
		const data: IWebhookResponseCallbackData = {
			responseCode: 302,
			headers: { location: 'http://example.com' },
		};
		const workflowStartNode = mock<INode>({
			type: WAIT_NODE_TYPE,
			parameters: { resume: 'webhook' },
		});
		const result = handleFormRedirectionCase(data, workflowStartNode);
		expect(result).toEqual(data);
	});

	test('should modify data if start node type matches and responseCode is a redirect', () => {
		const data: IWebhookResponseCallbackData = {
			responseCode: 302,
			headers: { location: 'http://example.com' },
		};
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			parameters: {},
		});
		const result = handleFormRedirectionCase(data, workflowStartNode);
		expect(result.responseCode).toBe(200);
		expect(result.data).toEqual({ redirectURL: 'http://example.com' });
		expect((result?.headers as IDataObject)?.location).toBeUndefined();
	});

	test('should not modify data if location header is missing', () => {
		const data: IWebhookResponseCallbackData = { responseCode: 302, headers: {} };
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			parameters: {},
		});
		const result = handleFormRedirectionCase(data, workflowStartNode);
		expect(result).toEqual(data);
	});
});

describe('setupResponseNodePromise', () => {
	const workflowId = 'test-workflow-id';
	const executionId = 'test-execution-id';
	const res = mock<express.Response>();
	const responseCallback = jest.fn();
	const workflowStartNode = mock<INode>();
	const workflow = mock<Workflow>({ id: workflowId });
	const binaryDataService = mockInstance(BinaryDataService);
	const errorReporter = mockInstance(ErrorReporter);
	const logger = mockInstance(Logger);

	let responsePromise: IDeferredPromise<IN8nHttpFullResponse>;

	beforeEach(() => {
		jest.resetAllMocks();

		responsePromise = createDeferredPromise<IN8nHttpFullResponse>();

		res.header.mockReturnValue(res);
		res.end.mockReturnValue(res);
	});

	test('should handle regular response object', async () => {
		setupResponseNodePromise(
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
		const mockStream = mock<Readable>();
		binaryDataService.getAsStream.mockResolvedValue(mockStream);

		setupResponseNodePromise(
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
		expect(finished).toHaveBeenCalledWith(mockStream);
		expect(responseCallback).toHaveBeenCalledWith(null, { noWebhookResponse: true });
	});

	test('should handle buffer response', async () => {
		setupResponseNodePromise(
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
		setupResponseNodePromise(
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

describe('prepareExecutionData', () => {
	const workflowStartNode = mock<INode>({ name: 'Start' });
	const webhookResultData: IWebhookResponseData = {
		workflowData: [[{ json: { data: 'test' } }]],
	};
	const workflowData = mock<IWorkflowBase>({
		id: 'workflow1',
		pinData: { nodeA: [{ json: { pinned: true } }] },
	});

	test('should create new execution data when not provided', () => {
		const { runExecutionData, pinData } = prepareExecutionData(
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
		const nodeExecutionStack: IExecuteData[] = [
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
		} as IRunExecutionData;

		prepareExecutionData(
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
		const { runExecutionData } = prepareExecutionData(
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

		const { runExecutionData } = prepareExecutionData(
			'manual',
			workflowStartNode,
			webhookResultData,
			undefined,
			runExecutionDataMerge,
		);

		expect(runExecutionData.resultData.error).toEqual({ message: 'Test error' });
	});

	test('should set pinData when execution mode is manual', () => {
		const { runExecutionData, pinData } = prepareExecutionData(
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
		const { runExecutionData, pinData } = prepareExecutionData(
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
