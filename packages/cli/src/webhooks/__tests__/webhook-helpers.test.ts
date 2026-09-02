import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mockInstance } from '@n8n/backend-test-utils';
import type express from 'express';
import {
	BinaryDataService,
	ErrorReporter,
	ExecutionContextService,
	getHtmlSandboxCSP,
	isWebhookHtmlSandboxingDisabled,
} from 'n8n-core';

vi.mock('n8n-core', async () => ({
	...(await vi.importActual<typeof import('n8n-core')>('n8n-core')),
	isWebhookHtmlSandboxingDisabled: vi.fn(),
	getHtmlSandboxCSP: vi.fn(),
}));
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	Workflow,
	INode,
	INodeType,
	IDataObject,
	IWebhookResponseData,
	IN8nHttpFullResponse,
	IWorkflowBase,
	IRunExecutionData,
	IExecuteData,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	CredentialCheckResult,
	IRun,
	IExecuteResponsePromiseData,
} from 'n8n-workflow';
import {
	FORM_NODE_TYPE,
	WAIT_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	WorkflowConfigurationError,
	NodeOperationError,
	MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';
import type { Readable } from 'stream';
import { finished } from 'stream/promises';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { WebhookResponseRelay } from '@/scaling/webhook-response-relay';

import {
	autoDetectResponseMode,
	handleFormRedirectionCase,
	setupResponseNodePromise,
	prepareExecutionData,
	handleHostedChatResponse,
	executeWebhook,
	_privateGetWebhookErrorMessage,
} from '../webhook-helpers';
import { EXECUTION_ENDED_WITHOUT_RESPONSE } from '../constants';
import type { IWebhookResponseCallbackData, WebhookRequest } from '../webhook.types';
import type { Project } from '@n8n/db';
import { ActiveExecutions } from '@/active-executions';
import { AuthService } from '@/auth/auth.service';
import { EventService } from '@/events/event.service';
import { OwnershipService } from '@/services/ownership.service';
import type { ProtectedResource } from '@/services/protected-resource.registry';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WorkflowRunner } from '@/workflow-runner';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WebhookService } from '../webhook.service';

vi.mock('stream/promises', () => ({
	finished: vi.fn(),
}));

describe('autoDetectResponseMode', () => {
	let workflow: MockProxy<Workflow>;

	beforeEach(() => {
		workflow = mock<Workflow>();
		workflow.nodes = {};
	});

	test('should return hostedChat when start node is CHAT_TRIGGER_NODE_TYPE, method is POST, and public is true', () => {
		const workflowStartNode = mock<INode>({
			type: CHAT_TRIGGER_NODE_TYPE,
			parameters: { options: { responseMode: 'responseNodes' } },
		});
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'POST');
		expect(result).toBe('hostedChat');
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

	test('should block javascript: URLs for security', () => {
		const data: IWebhookResponseCallbackData = {
			responseCode: 302,
			headers: { location: 'javascript:alert(document.domain)' },
		};
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			parameters: {},
		});
		const result = handleFormRedirectionCase(data, workflowStartNode);
		expect(result.responseCode).toBe(200);
		expect(result.data).toBeUndefined();
		expect((result?.headers as IDataObject)?.location).toBeUndefined();
	});

	test('should block data: URLs for security', () => {
		const data: IWebhookResponseCallbackData = {
			responseCode: 302,
			headers: { location: 'data:text/html,<script>alert(1)</script>' },
		};
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			parameters: {},
		});
		const result = handleFormRedirectionCase(data, workflowStartNode);
		expect(result.responseCode).toBe(200);
		expect(result.data).toBeUndefined();
		expect((result?.headers as IDataObject)?.location).toBeUndefined();
	});

	test('should allow https: URLs', () => {
		const data: IWebhookResponseCallbackData = {
			responseCode: 302,
			headers: { location: 'https://example.com/callback' },
		};
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			parameters: {},
		});
		const result = handleFormRedirectionCase(data, workflowStartNode);
		expect(result.responseCode).toBe(200);
		expect(result.data).toEqual({ redirectURL: 'https://example.com/callback' });
	});
});

describe('setupResponseNodePromise', () => {
	const workflowId = 'test-workflow-id';
	const executionId = 'test-execution-id';
	const res = mock<express.Response>();
	const responseCallback = vi.fn();
	const workflowStartNode = mock<INode>();
	const workflow = mock<Workflow>({ id: workflowId });
	const binaryDataService = mockInstance(BinaryDataService);
	const webhookResponseRelay = mockInstance(WebhookResponseRelay);
	const errorReporter = mockInstance(ErrorReporter);
	const logger = mockInstance(Logger);

	let responsePromise: IDeferredPromise<IN8nHttpFullResponse>;

	beforeEach(() => {
		vi.resetAllMocks();

		vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(false);
		vi.mocked(getHtmlSandboxCSP).mockReturnValue('sandbox allow-forms allow-scripts');

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
		expect(res.setHeaders).toHaveBeenCalledWith(new Map([['content-type', 'image/jpeg']]));
		expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getHtmlSandboxCSP());
		expect(mockStream.pipe).toHaveBeenCalledWith(res, { end: false });
		expect(finished).toHaveBeenCalledWith(mockStream);
		expect(responseCallback).toHaveBeenCalledWith(null, { noWebhookResponse: true });
	});

	test('should reclaim an offloaded body once it has been streamed', async () => {
		binaryDataService.getAsStream.mockResolvedValue(mock<Readable>());
		const response = {
			body: { binaryData: { id: 'binary-123' } },
			headers: {},
			statusCode: 200,
		} as unknown as IN8nHttpFullResponse;

		setupResponseNodePromise(
			responsePromise,
			res,
			responseCallback,
			workflowStartNode,
			executionId,
			workflow,
		);

		responsePromise.resolve(response);
		await new Promise(process.nextTick);

		expect(webhookResponseRelay.deleteOffloadedBody).toHaveBeenCalledWith(response, {
			workflowId,
			executionId,
		});
	});

	test('should destroy the stream when the client goes away, so delivery settles', async () => {
		const stream = mock<Readable>();
		binaryDataService.getAsStream.mockResolvedValue(stream);

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
			headers: {},
			statusCode: 200,
		} as unknown as IN8nHttpFullResponse);
		await new Promise(process.nextTick);

		const closeHandler = res.once.mock.calls.find(([event]) => event === 'close')?.[1] as
			| (() => void)
			| undefined;
		expect(closeHandler).toBeDefined();
		expect(stream.destroy).not.toHaveBeenCalled();

		closeHandler!();

		expect(stream.destroy).toHaveBeenCalled();
	});

	test('should reclaim an offloaded body even when streaming fails', async () => {
		binaryDataService.getAsStream.mockRejectedValue(new Error('store is down'));

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
			headers: {},
			statusCode: 200,
		} as unknown as IN8nHttpFullResponse);
		await new Promise(process.nextTick);

		expect(webhookResponseRelay.deleteOffloadedBody).toHaveBeenCalled();
		expect(responseCallback).toHaveBeenCalledWith(expect.any(Error), {});
	});

	test('should apply the status code to binary data responses', async () => {
		binaryDataService.getAsStream.mockResolvedValue(mock<Readable>());

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
			headers: {},
			statusCode: 201,
		});
		await new Promise(process.nextTick);

		expect(res.status).toHaveBeenCalledWith(201);
	});

	test('should not set sandbox CSP header on binary stream responses when sandboxing is disabled', async () => {
		vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(true);
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
			headers: { 'content-type': 'text/html' },
			statusCode: 200,
		});
		await new Promise(process.nextTick);

		expect(res.setHeader).not.toHaveBeenCalledWith('Content-Security-Policy', expect.anything());
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

		expect(res.setHeaders).toHaveBeenCalledWith(new Map([['content-type', 'text/plain']]));
		expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getHtmlSandboxCSP());
		expect(res.end).toHaveBeenCalledWith(buffer);
		expect(responseCallback).toHaveBeenCalledWith(null, { noWebhookResponse: true });
	});

	test('should apply the status code to buffer responses', async () => {
		setupResponseNodePromise(
			responsePromise,
			res,
			responseCallback,
			workflowStartNode,
			executionId,
			workflow,
		);

		responsePromise.resolve({
			body: Buffer.from('created'),
			headers: {},
			statusCode: 201,
		});
		await new Promise(process.nextTick);

		expect(res.status).toHaveBeenCalledWith(201);
	});

	test('should not set sandbox CSP header on buffer responses when sandboxing is disabled', async () => {
		vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(true);

		setupResponseNodePromise(
			responsePromise,
			res,
			responseCallback,
			workflowStartNode,
			executionId,
			workflow,
		);

		responsePromise.resolve({
			body: Buffer.from('<html></html>'),
			headers: { 'content-type': 'text/html' },
			statusCode: 200,
		});
		await new Promise(process.nextTick);

		expect(res.setHeader).not.toHaveBeenCalledWith('Content-Security-Policy', expect.anything());
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

	// When an execution ends without the Respond to Webhook node having run,
	// `ActiveExecutions.resolveExecutionResponsePromise` settles this promise with a
	// sentinel. The post-execute handler answers in that case, so this one must not.
	test('should not respond when the execution ended without a response', async () => {
		setupResponseNodePromise(
			responsePromise,
			res,
			responseCallback,
			workflowStartNode,
			executionId,
			workflow,
		);

		responsePromise.resolve(EXECUTION_ENDED_WITHOUT_RESPONSE as IN8nHttpFullResponse);
		await new Promise(process.nextTick);

		expect(errorReporter.error).not.toHaveBeenCalled();
		expect(responseCallback).not.toHaveBeenCalled();
	});
});

describe('handleHostedChatResponse', () => {
	it('should send executionStarted: true, executionId, and resumeToken when responseMode is hostedChat', async () => {
		const res = {
			send: vi.fn(),
			end: vi.fn(),
		} as unknown as express.Response;
		const responseMode = 'hostedChat';
		const didSendResponse = false;
		const executionId = '123';
		const resumeToken = 'a'.repeat(64);

		const result = handleHostedChatResponse(
			res,
			responseMode,
			didSendResponse,
			executionId,
			resumeToken,
		);

		expect(res.send).toHaveBeenCalledWith({ executionStarted: true, executionId, resumeToken });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(res.end).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it('should not send response when responseMode is not hostedChat', () => {
		const res = {
			send: vi.fn(),
			end: vi.fn(),
		} as unknown as express.Response;
		const executionId = 'testExecutionId';
		const didSendResponse = false;
		const responseMode = 'responseNode';

		const result = handleHostedChatResponse(res, responseMode, didSendResponse, executionId);

		expect(res.send).not.toHaveBeenCalled();
		expect(res.end).not.toHaveBeenCalled();
		expect(result).toBe(false);
	});

	it('should not send response when didSendResponse is true', () => {
		const res = {
			send: vi.fn(),
			end: vi.fn(),
		} as unknown as express.Response;
		const executionId = 'testExecutionId';
		const didSendResponse = true;
		const responseMode = 'hostedChat';

		const result = handleHostedChatResponse(res, responseMode, didSendResponse, executionId);

		expect(res.send).not.toHaveBeenCalled();
		expect(res.end).not.toHaveBeenCalled();
		expect(result).toBe(true);
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
			{ nodeName: 'targetNode', mode: 'inclusive' },
		);

		expect(runExecutionData.startData?.destinationNode).toEqual({
			nodeName: 'targetNode',
			mode: 'inclusive',
		});
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

	test('should populate manualData.userId for manual executions when userId is provided', () => {
		const { runExecutionData } = prepareExecutionData(
			'manual',
			workflowStartNode,
			webhookResultData,
			undefined,
			{},
			undefined,
			undefined,
			workflowData,
			'user-abc',
		);

		expect(runExecutionData.manualData).toEqual({ userId: 'user-abc' });
	});

	test('should not populate manualData when userId is undefined', () => {
		const { runExecutionData } = prepareExecutionData(
			'manual',
			workflowStartNode,
			webhookResultData,
			undefined,
			{},
			undefined,
			undefined,
			workflowData,
			undefined,
		);

		expect(runExecutionData.manualData).toBeUndefined();
	});

	test('should not populate manualData for non-manual execution modes', () => {
		const { runExecutionData } = prepareExecutionData(
			'webhook',
			workflowStartNode,
			webhookResultData,
			undefined,
			{},
			undefined,
			undefined,
			workflowData,
			'user-abc',
		);

		expect(runExecutionData.manualData).toBeUndefined();
	});

	describe('seeded execution stack merge condition', () => {
		test.each([
			MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
			MCP_TRIGGER_NODE_TYPE,
			CHAT_TRIGGER_NODE_TYPE,
		])(
			'should merge nodeExecutionStack when node type is %s and runExecutionData exists',
			(type) => {
				const seededTriggerNode = mock<INode>({ name: 'Seeded Trigger', type });

				const existingNodeExecutionStack: IExecuteData[] = [
					{
						node: mock<INode>({ name: 'ExistingNode' }),
						data: {
							main: [[{ json: { existing: 'data' } }]],
						},
						source: null,
					},
				];

				const existingRunExecutionData: IRunExecutionData = {
					version: 1,
					startData: {},
					resultData: { runData: {} },
					executionData: {
						contextData: {},
						metadata: {},
						nodeExecutionStack: existingNodeExecutionStack,
						waitingExecution: {},
						waitingExecutionSource: {},
					},
				} as IRunExecutionData;

				const { runExecutionData } = prepareExecutionData(
					'trigger',
					seededTriggerNode,
					webhookResultData,
					existingRunExecutionData,
				);

				expect(runExecutionData.executionData?.nodeExecutionStack).toHaveLength(1);
				expect(runExecutionData.executionData?.nodeExecutionStack[0].node.name).toBe(
					'Seeded Trigger',
				);
				expect(runExecutionData.executionData?.nodeExecutionStack[0].node.type).toBe(type);
				expect(runExecutionData.executionData?.nodeExecutionStack[0].data.main[0]).toHaveLength(1);
				expect(
					runExecutionData.executionData?.nodeExecutionStack[0].data.main[0]?.[0]?.json,
				).toEqual({
					existing: 'data',
					data: 'test',
				});
			},
		);

		test('should not merge when node type is MICROSOFT_AGENT365_TRIGGER_NODE_TYPE but runExecutionData is undefined', () => {
			const microsoftAgentNode = mock<INode>({
				name: 'Microsoft Agent 365',
				type: MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
			});

			const { runExecutionData } = prepareExecutionData(
				'trigger',
				microsoftAgentNode,
				webhookResultData,
				undefined,
			);

			expect(runExecutionData.executionData?.nodeExecutionStack).toHaveLength(1);
			expect(runExecutionData.executionData?.nodeExecutionStack[0].node).toEqual(
				microsoftAgentNode,
			);
		});

		test('should not merge when node type is MICROSOFT_AGENT365_TRIGGER_NODE_TYPE but nodeExecutionStack is undefined', () => {
			const microsoftAgentNode = mock<INode>({
				name: 'Microsoft Agent 365',
				type: MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
			});

			const existingRunExecutionData: IRunExecutionData = {
				version: 1,
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: undefined as any,
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			} as IRunExecutionData;

			const { runExecutionData } = prepareExecutionData(
				'trigger',
				microsoftAgentNode,
				webhookResultData,
				existingRunExecutionData,
			);

			expect(runExecutionData.executionData?.nodeExecutionStack).toBeUndefined();
		});

		test('should not merge when node type is not MICROSOFT_AGENT365_TRIGGER_NODE_TYPE', () => {
			const regularNode = mock<INode>({
				name: 'Regular Webhook',
				type: 'n8n-nodes-base.webhook',
			});

			const existingNodeExecutionStack: IExecuteData[] = [
				{
					node: mock<INode>({ name: 'ExistingNode' }),
					data: {
						main: [[{ json: { existing: 'data' } }]],
					},
					source: null,
				},
			];

			const existingRunExecutionData: IRunExecutionData = {
				version: 1,
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: existingNodeExecutionStack,
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			} as IRunExecutionData;

			const { runExecutionData } = prepareExecutionData(
				'trigger',
				regularNode,
				webhookResultData,
				existingRunExecutionData,
			);

			expect(runExecutionData.executionData?.nodeExecutionStack).toHaveLength(1);
			expect(runExecutionData.executionData?.nodeExecutionStack?.[0]?.node.name).toBe(
				'ExistingNode',
			);

			expect(runExecutionData.executionData?.nodeExecutionStack?.[0]?.data.main).toEqual([
				[{ json: { existing: 'data' } }],
			]);
		});

		test('should replace the seeded stack (not merge) for a Webhook node using n8nOAuth2 auth, preserving runtimeData', () => {
			const identityWebhookNode = mock<INode>({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters: { authentication: 'n8nOAuth2' },
			});

			// After the node's webhook() call the identity is already established: the
			// seeder's placeholder item has been consumed by the hook (leaving an empty
			// item) and the resolved credentials live on executionData.runtimeData.
			const existingNodeExecutionStack: IExecuteData[] = [
				{
					node: mock<INode>({ name: 'ExistingNode' }),
					data: {
						main: [[{ json: {} }]],
					},
					source: null,
				},
			];

			const existingRunExecutionData: IRunExecutionData = {
				version: 1,
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: existingNodeExecutionStack,
					waitingExecution: {},
					waitingExecutionSource: {},
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					runtimeData: { version: 1, credentials: { source: 'n8n-oauth' } } as any,
				},
			} as IRunExecutionData;

			const { runExecutionData } = prepareExecutionData(
				'trigger',
				identityWebhookNode,
				webhookResultData,
				existingRunExecutionData,
			);

			expect(runExecutionData.executionData?.nodeExecutionStack).toHaveLength(1);
			// The seeded placeholder is discarded; only the webhook's real output remains.
			expect(runExecutionData.executionData?.nodeExecutionStack[0].data.main).toEqual([
				[{ json: { data: 'test' } }],
			]);
			// The established identity (runtimeData) is preserved across the replace.
			expect(runExecutionData.executionData?.runtimeData).toEqual({
				version: 1,
				credentials: { source: 'n8n-oauth' },
			});
		});

		test('should not leak the seeded placeholder into output slot 0 for a multi-method n8nOAuth2 webhook', () => {
			const identityWebhookNode = mock<INode>({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters: { authentication: 'n8nOAuth2' },
			});

			// Seeded placeholder sits in output slot 0.
			const existingNodeExecutionStack: IExecuteData[] = [
				{
					node: mock<INode>({ name: 'ExistingNode' }),
					data: {
						main: [[{ json: {} }]],
					},
					source: null,
				},
			];

			const existingRunExecutionData: IRunExecutionData = {
				version: 1,
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: existingNodeExecutionStack,
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			} as IRunExecutionData;

			// A multi-method webhook routes the request to a non-first output slot; e.g.
			// a POST on a ['GET','POST'] node puts the item in slot 1, slot 0 stays empty.
			const multiMethodResult: IWebhookResponseData = {
				workflowData: [[], [{ json: { method: 'POST' } }]],
			};

			const { runExecutionData } = prepareExecutionData(
				'trigger',
				identityWebhookNode,
				multiMethodResult,
				existingRunExecutionData,
			);

			// Slot 0 must be empty (no phantom placeholder firing the GET branch).
			expect(runExecutionData.executionData?.nodeExecutionStack[0].data.main).toEqual([
				[],
				[{ json: { method: 'POST' } }],
			]);
		});

		test('should merge existing data with new data for MICROSOFT_AGENT365_TRIGGER_NODE_TYPE', () => {
			const microsoftAgentNode = mock<INode>({
				name: 'Microsoft Agent 365',
				type: MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
			});

			const existingData: IExecuteData = {
				node: mock<INode>({ name: 'ExistingNode' }),
				data: {
					main: [[{ json: { existing: 'preserved' } }]],
				},
				source: { main: [{ previousNode: 'test' }] },
			};

			const existingRunExecutionData: IRunExecutionData = {
				version: 1,
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [existingData],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			} as IRunExecutionData;

			const { runExecutionData } = prepareExecutionData(
				'trigger',
				microsoftAgentNode,
				webhookResultData,
				existingRunExecutionData,
			);

			expect(runExecutionData.executionData?.nodeExecutionStack).toHaveLength(1);

			expect(runExecutionData.executionData?.nodeExecutionStack?.[0]?.node.name).toBe(
				'Microsoft Agent 365',
			);
			expect(runExecutionData.executionData?.nodeExecutionStack?.[0]?.node.type).toBe(
				MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
			);

			expect(runExecutionData.executionData?.nodeExecutionStack?.[0]?.data.main[0]).toHaveLength(1);
			expect(
				runExecutionData.executionData?.nodeExecutionStack?.[0]?.data.main[0]?.[0]?.json,
			).toEqual({
				existing: 'preserved',
				data: 'test',
			});

			expect(runExecutionData.executionData?.nodeExecutionStack?.[0]?.source).toBeNull();
		});
	});
});

describe('getWebhookErrorMessage', () => {
	const workflowStartNode = mock<INode>({ name: 'Start' });
	it('should surface WorkflowConfigurationError', () => {
		const err = new WorkflowConfigurationError(workflowStartNode, new Error('test'));
		expect(_privateGetWebhookErrorMessage(err, 'Webhook')).toEqual(err.message);
	});

	it('should obfuscate other errors', () => {
		const err = new NodeOperationError(workflowStartNode, new Error('test'));
		expect(_privateGetWebhookErrorMessage(err, 'Webhook')).toContain(
			'Error: Workflow could not be started',
		);
	});
});

// Shared by the two `executeWebhook` blocks below: `mockInstance` overwrites the
// container binding, so registering these per-describe would leave the first block
// holding a mock the code under test no longer resolves.
const ownershipService = mockInstance(OwnershipService);
const webhookService = mockInstance(WebhookService);
const workflowRunner = mockInstance(WorkflowRunner);
const activeExecutions = mockInstance(ActiveExecutions);
const resourceRegistry = mockInstance(ProtectedResourceRegistry);
const executionContextService = mockInstance(ExecutionContextService);
mockInstance(AuthService);
mockInstance(EventService);
mockInstance(WorkflowStatisticsService);

const WORKFLOW_ID = 'wf-1';
const EXECUTION_ID = 'exec-1';

describe('executeWebhook credential-status gate', () => {
	const missingGateResult: CredentialCheckResult = {
		readyToExecute: false,
		credentials: [
			{
				credentialId: 'cred-1',
				credentialName: 'My Gmail',
				credentialType: 'gmailOAuth2',
				resolverId: 'resolver-1',
				status: 'missing',
				authorizationUrl:
					'https://n8n.test/rest/credentials/cred-1/authorize?token=signed-connect-token',
			},
		],
	};

	const readyGateResult: CredentialCheckResult = {
		readyToExecute: true,
		credentials: [
			{
				credentialId: 'cred-1',
				credentialName: 'My Gmail',
				credentialType: 'gmailOAuth2',
				resolverId: 'resolver-1',
				status: 'configured',
			},
		],
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();

		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'project-1', name: 'Project 1' }),
		);
		// The gate only runs when the webhook decided the workflow should execute
		// (workflowData present). Cases that pass the gate continue into WorkflowRunner.
		webhookService.runWebhook.mockResolvedValue({ workflowData: [[{ json: {} }]] });
		workflowRunner.run.mockResolvedValue(EXECUTION_ID);
		activeExecutions.getPostExecutePromise.mockReturnValue(new Promise(() => {}));
	});

	/**
	 * Drives `executeWebhook` for a Webhook node with the given authentication mode and
	 * wires the dynamic-credentials credential-check proxy to return `gateResult`.
	 * Returns the spied proxy and the captured `responseCallback`.
	 */
	const runGate = async (options: {
		authentication: string;
		gateResult?: CredentialCheckResult;
		webhookResult?: IWebhookResponseData;
	}) => {
		const checkCredentialStatus = vi.fn().mockResolvedValue(options.gateResult);

		const additionalData = {
			'dynamic-credentials': { credentialCheckProxy: { checkCredentialStatus } },
			encryptedRunnerIdentity: 'encrypted-runner-identity',
			webhookWaitingBaseUrl: 'https://n8n.test/webhook-waiting',
			formWaitingBaseUrl: 'https://n8n.test/form-waiting',
		} as unknown as IWorkflowExecuteAdditionalData;
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

		if (options.webhookResult !== undefined) {
			webhookService.runWebhook.mockResolvedValue(options.webhookResult);
		}

		const workflowStartNode = mock<INode>({
			name: 'Webhook',
			type: WEBHOOK_NODE_TYPE,
			typeVersion: 2,
			parameters: { authentication: options.authentication },
		});

		// Force a valid `onReceived` response mode; the deep mock would otherwise return undefined.
		const workflow = mock<Workflow>({
			id: WORKFLOW_ID,
			name: 'Test Workflow',
			nodeTypes: {
				getByNameAndVersion: vi
					.fn()
					.mockReturnValue(mock<INodeType>({ description: { name: 'webhook' } })),
			},
			expression: {
				getSimpleParameterValue: vi.fn().mockReturnValue('onReceived'),
				getComplexParameterValue: vi.fn().mockReturnValue('firstEntryJson'),
			},
		});

		const webhookData = {
			webhookDescription: { name: 'default' },
			workflowId: WORKFLOW_ID,
		} as unknown as IWebhookData;

		const workflowData = mock<IWorkflowBase>({ id: WORKFLOW_ID, name: 'Test Workflow' });
		const req = mock<WebhookRequest>({ method: 'POST', contentType: undefined });
		const res = mock<express.Response>({ headersSent: false });
		const responseCallback = vi.fn();

		await executeWebhook(
			workflow,
			webhookData,
			workflowData,
			workflowStartNode,
			'manual',
			undefined,
			undefined,
			undefined,
			req,
			res,
			responseCallback,
		);

		return { checkCredentialStatus, responseCallback };
	};

	it('responds 428 with the missing-credential list and signed connect links when the caller has unconnected credentials', async () => {
		const { checkCredentialStatus, responseCallback } = await runGate({
			authentication: 'n8nOAuth2',
			gateResult: missingGateResult,
		});

		// Checked using the established identity and the workflow being called.
		expect(checkCredentialStatus).toHaveBeenCalledWith(WORKFLOW_ID, {
			credentials: 'encrypted-runner-identity',
		});

		expect(responseCallback).toHaveBeenCalledWith(null, {
			data: missingGateResult,
			responseCode: 428,
		});

		// The 428 body carries a valid signed connect link for each missing credential.
		const [, callbackData] = responseCallback.mock.calls[0] as [
			unknown,
			IWebhookResponseCallbackData,
		];
		expect(callbackData.data).toBe(missingGateResult);
		expect(missingGateResult.credentials[0].authorizationUrl).toContain(
			'/credentials/cred-1/authorize?token=',
		);
		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	it('proceeds without a 428 when all resolvable credentials are connected', async () => {
		const { checkCredentialStatus, responseCallback } = await runGate({
			authentication: 'n8nOAuth2',
			gateResult: readyGateResult,
		});

		expect(checkCredentialStatus).toHaveBeenCalledTimes(1);
		expect(responseCallback).not.toHaveBeenCalledWith(
			null,
			expect.objectContaining({ responseCode: 428 }),
		);
		// Execution continued past the gate into the workflow runner.
		expect(workflowRunner.run).toHaveBeenCalled();
	});

	it('does not gate webhooks that do not establish a triggering identity', async () => {
		const { checkCredentialStatus, responseCallback } = await runGate({
			authentication: 'none',
			gateResult: missingGateResult,
		});

		expect(checkCredentialStatus).not.toHaveBeenCalled();
		expect(responseCallback).not.toHaveBeenCalledWith(
			null,
			expect.objectContaining({ responseCode: 428 }),
		);
		expect(workflowRunner.run).toHaveBeenCalled();
	});

	it('does not gate when Only Run If prevents the workflow from executing', async () => {
		const { checkCredentialStatus, responseCallback } = await runGate({
			authentication: 'n8nOAuth2',
			gateResult: missingGateResult,
			// Bare `{}` is what Webhook.node returns when Only Run If evaluates falsy.
			webhookResult: {},
		});

		expect(checkCredentialStatus).not.toHaveBeenCalled();
		expect(responseCallback).not.toHaveBeenCalledWith(
			null,
			expect.objectContaining({ responseCode: 428 }),
		);
		expect(responseCallback).toHaveBeenCalledWith(
			null,
			expect.objectContaining({
				data: { message: 'Webhook call received' },
			}),
		);
		expect(workflowRunner.run).not.toHaveBeenCalled();
	});
});

describe('executeWebhook establishTriggerIdentity', () => {
	const RESOURCE_URL = 'https://n8n.test/webhook-test/abc?method=POST';
	const GRANT = { audiences: [RESOURCE_URL], executeAccessWorkflowId: WORKFLOW_ID };

	const resourceWithoutGrant: ProtectedResource = {
		id: `workflow-webhook-test:${WORKFLOW_ID}:abc`,
		getResourceUrl: () => RESOURCE_URL,
		getAudiences: () => [RESOURCE_URL],
		scopes: [],
		authorize: async () => true,
	};

	const resourceWithGrant: ProtectedResource = { ...resourceWithoutGrant, getGrant: () => GRANT };

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();

		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'project-1', name: 'Project 1' }),
		);
		workflowRunner.run.mockResolvedValue(EXECUTION_ID);
		activeExecutions.getPostExecutePromise.mockReturnValue(new Promise(() => {}));
		executionContextService.buildTriggerIdentityCredentials.mockResolvedValue('sealed-context');
		// `establishExecutionContext` binds the execution id onto the sealed context; with no
		// execution id yet (or no sealed subject) it hands the context straight back.
		executionContextService.maybeBindExecutionId.mockImplementation(async (context) => context);
		// `establishExecutionContext` runs the hook pass over the seeded stack.
		executionContextService.augmentExecutionContextWithHooks.mockImplementation(
			async (_workflow, _startItem, context) => ({ context, triggerItems: null }),
		);
	});

	/**
	 * Drives `executeWebhook` for an `n8nOAuth2` Webhook node whose `webhook()` seeds the
	 * run with the caller it just authenticated — what `n8nOAuth2Auth` plus
	 * `context.establishTriggerIdentity` do in the node.
	 */
	const runWithTriggerIdentity = async (
		resource: ProtectedResource | undefined,
		options: { registrationIdentity?: string; establishesIdentity?: boolean } = {},
	) => {
		const { registrationIdentity, establishesIdentity = true } = options;

		resourceRegistry.getByResourceUrl.mockResolvedValue(resource);

		const additionalData = {
			webhookWaitingBaseUrl: 'https://n8n.test/webhook-waiting',
			formWaitingBaseUrl: 'https://n8n.test/form-waiting',
		} as unknown as IWorkflowExecuteAdditionalData;
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

		webhookService.runWebhook.mockImplementation(async (_workflow, _webhookData, _node, data) => {
			if (establishesIdentity) {
				await data.establishTriggerIdentity!('caller-token', RESOURCE_URL);
			}
			return { workflowData: [[{ json: {} }]] };
		});

		const workflowStartNode = mock<INode>({
			name: 'Webhook',
			type: WEBHOOK_NODE_TYPE,
			typeVersion: 2,
			parameters: { authentication: 'n8nOAuth2' },
		});

		const workflow = mock<Workflow>({
			id: WORKFLOW_ID,
			name: 'Test Workflow',
			nodeTypes: {
				getByNameAndVersion: vi
					.fn()
					.mockReturnValue(mock<INodeType>({ description: { name: 'webhook' } })),
			},
			expression: {
				getSimpleParameterValue: vi.fn().mockReturnValue('onReceived'),
				getComplexParameterValue: vi.fn().mockReturnValue('firstEntryJson'),
			},
		});

		await executeWebhook(
			workflow,
			{
				webhookDescription: { name: 'default' },
				workflowId: WORKFLOW_ID,
			} as unknown as IWebhookData,
			mock<IWorkflowBase>({ id: WORKFLOW_ID, name: 'Test Workflow' }),
			workflowStartNode,
			'manual',
			undefined,
			undefined,
			undefined,
			mock<WebhookRequest>({ method: 'POST', contentType: undefined }),
			mock<express.Response>({ headersSent: false }),
			vi.fn(),
			undefined,
			{ encryptedRunnerIdentity: registrationIdentity },
		);

		return additionalData;
	};

	it('seals the resource grant, so the run can still verify itself once the trigger is gone', async () => {
		const additionalData = await runWithTriggerIdentity(resourceWithGrant);

		expect(resourceRegistry.getByResourceUrl).toHaveBeenCalledWith(RESOURCE_URL);
		expect(executionContextService.buildTriggerIdentityCredentials).toHaveBeenCalledWith(
			'caller-token',
			RESOURCE_URL,
			GRANT,
			undefined,
		);
		expect(additionalData.encryptedRunnerIdentity).toBe('sealed-context');
	});

	it('hands the sealed context to the runner, so it survives the queue hop', async () => {
		await runWithTriggerIdentity(resourceWithGrant);

		const [runData] = workflowRunner.run.mock.calls[0];

		// Both the field the worker reads and the context persisted with the execution.
		expect(runData.encryptedRunnerIdentity).toBe('sealed-context');
		expect(runData.executionData?.executionData?.runtimeData?.credentials).toBe('sealed-context');
		expect(runData.executionData?.resultData.error).toBeUndefined();
	});

	it('seals no grant for a resource whose gate cannot be expressed as one', async () => {
		await runWithTriggerIdentity(resourceWithoutGrant);

		expect(executionContextService.buildTriggerIdentityCredentials).toHaveBeenCalledWith(
			'caller-token',
			RESOURCE_URL,
			undefined,
			undefined,
		);
	});

	it('seals no grant when the resource has already stopped resolving', async () => {
		await runWithTriggerIdentity(undefined);

		expect(executionContextService.buildTriggerIdentityCredentials).toHaveBeenCalledWith(
			'caller-token',
			RESOURCE_URL,
			undefined,
			undefined,
		);
	});

	it('lets a node override the identity carried on the test-webhook registration', async () => {
		await runWithTriggerIdentity(resourceWithGrant, {
			registrationIdentity: 'registration-context',
		});

		const [runData] = workflowRunner.run.mock.calls[0];

		// The registration carrier is only a fallback: a node that authenticates the caller
		// itself establishes the stronger sealed carrier, and that is what the run uses.
		expect(runData.encryptedRunnerIdentity).toBe('sealed-context');
	});

	it('carries the test-webhook registration identity when no node establishes one', async () => {
		const additionalData = await runWithTriggerIdentity(resourceWithGrant, {
			registrationIdentity: 'registration-context',
			establishesIdentity: false,
		});

		const [runData] = workflowRunner.run.mock.calls[0];

		expect(executionContextService.buildTriggerIdentityCredentials).not.toHaveBeenCalled();
		expect(additionalData.encryptedRunnerIdentity).toBe('registration-context');
		expect(runData.encryptedRunnerIdentity).toBe('registration-context');
	});
});

// Reproduction for CAT-4050 / GitHub issue #36175: in `responseNode` mode, when
// a node fails before the Respond to Webhook node has run, the execution never
// sends a response. These tests pin down what the HTTP caller receives instead.
describe('executeWebhook in responseNode mode when the Respond node never runs', () => {
	// `mockInstance(Logger)` above already replaced the container binding.
	const logger = Container.get(Logger);
	/** An execution that failed at a node, as the reported agent branch does. */
	const erroredRun = mock<IRun>({
		mode: 'webhook',
		finished: false,
		status: 'error',
		data: {
			resultData: {
				error: new NodeOperationError(mock<INode>({ name: 'Agent' }), 'Model call failed'),
				runData: {},
				lastNodeExecuted: 'Agent',
			},
		},
	});

	/**
	 * Drives `executeWebhook` up to the point where the workflow is running, then
	 * hands back the deferred response promise that `executeWebhook` passed to
	 * `WorkflowRunner`, plus the post-execute deferred and the response callback.
	 * The caller decides in which order the two settle.
	 */
	const startWebhook = async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'project-1', name: 'Project 1' }),
		);
		webhookService.runWebhook.mockResolvedValue({ workflowData: [[{ json: {} }]] });
		workflowRunner.run.mockResolvedValue(EXECUTION_ID);

		const postExecute = createDeferredPromise<IRun | undefined>();
		activeExecutions.getPostExecutePromise.mockReturnValue(postExecute.promise);

		const workflow = mock<Workflow>({
			id: WORKFLOW_ID,
			name: 'Test Workflow',
			nodeTypes: {
				getByNameAndVersion: vi
					.fn()
					.mockReturnValue(mock<INodeType>({ description: { name: 'webhook' } })),
			},
			expression: {
				// Return the webhook description value, so `responseMode` below applies.
				getSimpleParameterValue: vi.fn(
					(...args: Parameters<Workflow['expression']['getSimpleParameterValue']>) =>
						args[1] /* paramValue */ ?? args[5] /* defaultValue */,
				),
				getComplexParameterValue: vi.fn(
					(...args: Parameters<Workflow['expression']['getComplexParameterValue']>) =>
						args[1] /* paramValue */,
				),
			},
		});

		const webhookData = {
			webhookDescription: { name: 'default', responseMode: 'responseNode' },
			workflowId: WORKFLOW_ID,
		} as unknown as IWebhookData;

		const responseCallback = vi.fn();

		await executeWebhook(
			workflow,
			webhookData,
			mock<IWorkflowBase>({ id: WORKFLOW_ID, name: 'Test Workflow' }),
			mock<INode>({ name: 'Webhook', type: WEBHOOK_NODE_TYPE, typeVersion: 2, parameters: {} }),
			'webhook',
			undefined,
			undefined,
			undefined,
			mock<WebhookRequest>({ method: 'POST', contentType: undefined, headers: {} }),
			mock<express.Response>({ headersSent: false }),
			responseCallback,
		);

		// Argument 5 of `WorkflowRunner.run` is the deferred response promise.
		const responsePromise = workflowRunner.run.mock
			.calls[0][4] as IDeferredPromise<IExecuteResponsePromiseData>;

		return { responsePromise, postExecute, responseCallback };
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	// `WorkflowRunner` calls `resolveExecutionResponsePromise` before
	// `finalizeExecution`, so the sentinel usually settles first. Either ordering must
	// produce the same answer.
	it('responds 500 when the response promise settles first', async () => {
		const { responsePromise, postExecute, responseCallback } = await startWebhook();

		responsePromise.resolve(EXECUTION_ENDED_WITHOUT_RESPONSE);
		postExecute.resolve(erroredRun);
		await new Promise(process.nextTick);

		expect(responseCallback.mock.calls[0]).toEqual([
			null,
			{ data: { message: 'Error in workflow' }, responseCode: 500 },
		]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Webhook execution failed before a response was sent',
			{
				executionId: EXECUTION_ID,
				workflowId: WORKFLOW_ID,
				responseMode: 'responseNode',
				lastNodeExecuted: 'Agent',
			},
		);
	});

	it('responds 500 when the post-execute promise settles first', async () => {
		const { responsePromise, postExecute, responseCallback } = await startWebhook();

		postExecute.resolve(erroredRun);
		await new Promise(process.nextTick);
		responsePromise.resolve(EXECUTION_ENDED_WITHOUT_RESPONSE);
		await new Promise(process.nextTick);

		expect(responseCallback.mock.calls[0]).toEqual([
			null,
			{ data: { message: 'Error in workflow' }, responseCode: 500 },
		]);
	});

	it('responds only once when the Respond to Webhook node answered before the failure', async () => {
		const { responsePromise, postExecute, responseCallback } = await startWebhook();

		responsePromise.resolve({ body: { ok: true }, headers: {}, statusCode: 200 });
		await new Promise(process.nextTick);
		postExecute.resolve(erroredRun);
		await new Promise(process.nextTick);

		expect(responseCallback).toHaveBeenCalledTimes(1);
		expect(responseCallback.mock.calls[0]).toEqual([
			null,
			{ data: { ok: true }, headers: {}, responseCode: 200 },
		]);
	});

	it('responds with an empty body when a successful execution never reached the node', async () => {
		const { responsePromise, postExecute, responseCallback } = await startWebhook();

		const successfulRun = mock<IRun>({
			mode: 'webhook',
			finished: true,
			status: 'success',
			data: { resultData: { error: undefined, runData: {}, lastNodeExecuted: 'Agent' } },
		});

		responsePromise.resolve(EXECUTION_ENDED_WITHOUT_RESPONSE);
		postExecute.resolve(successfulRun);
		await new Promise(process.nextTick);

		expect(responseCallback.mock.calls[0]).toEqual([null, { data: undefined, responseCode: 200 }]);
	});

	it('does not answer again while an offloaded binary response is still streaming', async () => {
		// The stream never arrives, so the binary branch has not answered yet when the
		// execution fails. The post-execute handler must not answer in its place.
		vi.mocked(Container.get(BinaryDataService).getAsStream).mockReturnValue(
			new Promise<Readable>(() => {}),
		);

		const { responsePromise, postExecute, responseCallback } = await startWebhook();

		responsePromise.resolve({
			body: { binaryData: { id: 'binary-1' } },
			headers: {},
			statusCode: 200,
		});
		await new Promise(process.nextTick);
		postExecute.resolve(erroredRun);
		await new Promise(process.nextTick);

		expect(responseCallback).not.toHaveBeenCalled();
	});

	it('does not answer twice when the node responded and the execution then succeeded', async () => {
		const { responsePromise, postExecute, responseCallback } = await startWebhook();

		const successfulRun = mock<IRun>({
			mode: 'webhook',
			finished: true,
			status: 'success',
			data: { resultData: { error: undefined, runData: {}, lastNodeExecuted: 'Agent' } },
		});

		responsePromise.resolve({ body: { ok: true }, headers: {}, statusCode: 200 });
		await new Promise(process.nextTick);
		postExecute.resolve(successfulRun);
		await new Promise(process.nextTick);

		expect(responseCallback).toHaveBeenCalledTimes(1);
	});
});
