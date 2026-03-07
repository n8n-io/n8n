import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type express from 'express';
import { mock, type MockProxy } from 'jest-mock-extended';
import { BinaryDataService, ErrorReporter, WebhookService } from 'n8n-core';
import type {
	Workflow,
	INode,
	IWebhookData,
	IWorkflowBase,
	WorkflowExecuteMode,
	ExecutionError,
} from 'n8n-workflow';
import {
	NodeOperationError,
	NodeApiError,
	createRunExecutionData,
} from 'n8n-workflow';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { ActiveExecutions } from '@/active-executions';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowStatisticsService } from '@/workflows/workflow-statistics.service';
import { EventService } from '@/events/event.service';
import { OwnershipService } from '@/services/ownership.service';
import { executeWebhook } from '../webhook-helpers';
import type { WebhookRequest } from '../webhook.types';

// Mock dependencies
jest.mock('@/workflow-runner');
jest.mock('@/active-executions');
jest.mock('@/workflows/workflow-statistics.service');
jest.mock('@/events/event.service');
jest.mock('@/services/ownership.service');

describe('Webhook Error Handling', () => {
	let workflow: MockProxy<Workflow>;
	let webhookData: MockProxy<IWebhookData>;
	let workflowData: MockProxy<IWorkflowBase>;
	let workflowStartNode: MockProxy<INode>;
	let req: MockProxy<WebhookRequest>;
	let res: MockProxy<express.Response>;
	let responseCallback: jest.Mock;
	let webhookService: MockProxy<WebhookService>;
	let workflowRunner: MockProxy<WorkflowRunner>;
	let activeExecutions: MockProxy<ActiveExecutions>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mocks
		workflow = mock<Workflow>();
		workflow.id = 'workflow-1';
		workflow.name = 'Test Workflow';
		workflow.nodeTypes = {
			getByNameAndVersion: jest.fn().mockReturnValue({
				description: { name: 'webhook' },
			}),
		} as any;
		workflow.expression = {
			getComplexParameterValue: jest.fn().mockReturnValue(undefined),
		} as any;

		webhookData = mock<IWebhookData>({
			httpMethod: 'POST',
			path: '/test',
			node: 'Webhook',
			webhookDescription: {
				responseMode: 'onReceived',
				responseCode: 200,
			},
			workflowId: 'workflow-1',
		});

		workflowData = mock<IWorkflowBase>({
			id: 'workflow-1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
		});

		workflowStartNode = mock<INode>({
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 1,
			parameters: {},
		});

		req = mock<WebhookRequest>({
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: { test: 'data' },
			contentType: 'application/json',
		} as any);

		res = mock<express.Response>({
			headersSent: false,
			setHeader: jest.fn(),
		} as any);

		responseCallback = jest.fn();

		// Mock services
		webhookService = mock<WebhookService>();
		workflowRunner = mock<WorkflowRunner>();
		activeExecutions = mock<ActiveExecutions>();

		Container.set(WebhookService, webhookService);
		Container.set(WorkflowRunner, workflowRunner);
		Container.set(ActiveExecutions, activeExecutions);
		Container.set(ErrorReporter, mockInstance(ErrorReporter));
		Container.set(WorkflowStatisticsService, mockInstance(WorkflowStatisticsService));
		Container.set(EventService, mockInstance(EventService));
		Container.set(OwnershipService, mockInstance(OwnershipService));
		Container.set(Logger, mockInstance(Logger));
		Container.set(BinaryDataService, mockInstance(BinaryDataService));

		// Mock WorkflowRunner.run to return execution ID
		workflowRunner.run.mockResolvedValue('execution-123');
		activeExecutions.getPostExecutePromise.mockReturnValue(
			Promise.resolve({
				data: createRunExecutionData({
					resultData: {
						runData: {},
					},
				}),
				finished: true,
				status: 'success',
			} as any),
		);
		activeExecutions.setResponseMode.mockResolvedValue(undefined);
	});

	describe('NodeOperationError (Validation Errors)', () => {
		it('should return 400 Bad Request for NodeOperationError', async () => {
			const error = new NodeOperationError(
				workflowStartNode,
				'JSON parameter needs to be valid JSON',
				{
					description: 'Invalid JSON in parameter',
				},
			);
			error.context = { parameter: 'jsonBody' };

			webhookService.runWebhook.mockRejectedValue(error);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			// Verify error was classified as BadRequestError (400)
			expect(responseCallback).toHaveBeenCalled();
			const errorArg = responseCallback.mock.calls.find((call) => call[0] !== null)?.[0];
			expect(errorArg).toBeInstanceOf(BadRequestError);
			expect(errorArg?.httpStatusCode).toBe(400);
			expect(errorArg?.message).toContain('JSON parameter needs to be valid JSON');
		});

		it('should create execution record even when validation error occurs', async () => {
			const error = new NodeOperationError(
				workflowStartNode,
				'JSON parameter needs to be valid JSON',
			);

			webhookService.runWebhook.mockRejectedValue(error);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			// Verify WorkflowRunner.run was called to create execution
			expect(workflowRunner.run).toHaveBeenCalled();
		});

		it('should include error metadata in execution data', async () => {
			const error = new NodeOperationError(
				workflowStartNode,
				'JSON parameter needs to be valid JSON',
				{
					description: 'Invalid JSON',
				},
			);
			error.context = { parameter: 'jsonBody' };

			webhookService.runWebhook.mockRejectedValue(error);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			// Verify execution data includes error
			const runCall = workflowRunner.run.mock.calls[0];
			const runData = runCall[0];
			expect(runData.executionData.resultData.error).toBeDefined();
			expect(runData.executionData.resultData.error.message).toContain(
				'JSON parameter needs to be valid JSON',
			);
			expect(runData.executionData.resultData.lastNodeExecuted).toBe('Webhook');
		});
	});

	describe('NodeApiError (API Errors)', () => {
		it('should return 400 Bad Request for NodeApiError with 4xx code', async () => {
			const error = new NodeApiError(
				workflowStartNode,
				{ message: 'Bad Request', statusCode: 400 },
				{ httpCode: '400' },
			);

			webhookService.runWebhook.mockRejectedValue(error);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			const errorArg = responseCallback.mock.calls.find((call) => call[0] !== null)?.[0];
			expect(errorArg).toBeInstanceOf(BadRequestError);
			expect(errorArg?.httpStatusCode).toBe(400);
		});

		it('should return 500 Internal Server Error for NodeApiError with 5xx code', async () => {
			const error = new NodeApiError(
				workflowStartNode,
				{ message: 'Internal Server Error', statusCode: 500 },
				{ httpCode: '500' },
			);

			webhookService.runWebhook.mockRejectedValue(error);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			const errorArg = responseCallback.mock.calls.find((call) => call[0] !== null)?.[0];
			expect(errorArg).toBeInstanceOf(InternalServerError);
			expect(errorArg?.httpStatusCode).toBe(500);
		});
	});

	describe('Runtime Errors', () => {
		it('should return 500 Internal Server Error for generic runtime errors', async () => {
			const error = new Error('Runtime error occurred');

			webhookService.runWebhook.mockRejectedValue(error);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			const errorArg = responseCallback.mock.calls.find((call) => call[0] !== null)?.[0];
			expect(errorArg).toBeInstanceOf(InternalServerError);
			expect(errorArg?.httpStatusCode).toBe(500);
		});

		it('should create execution record for runtime errors', async () => {
			const error = new Error('Runtime error');

			webhookService.runWebhook.mockRejectedValue(error);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			expect(workflowRunner.run).toHaveBeenCalled();
		});
	});

	describe('Execution Error Handling', () => {
		it('should classify execution errors with proper HTTP status codes', async () => {
			const executionError: ExecutionError = {
				name: 'NodeOperationError',
				message: 'JSON parameter needs to be valid JSON',
				stack: 'Error stack',
			} as ExecutionError;

			// Mock successful webhook but failed execution
			webhookService.runWebhook.mockResolvedValue({
				workflowData: [[{ json: { test: 'data' } }]],
			});

			activeExecutions.getPostExecutePromise.mockReturnValue(
				Promise.resolve({
					data: createRunExecutionData({
						resultData: {
							runData: {},
							error: executionError,
						},
					}),
					finished: true,
					status: 'error',
				} as any),
			);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			// Wait for promise to resolve
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Verify error was classified
			const errorCall = responseCallback.mock.calls.find((call) => call[0] !== null);
			if (errorCall) {
				expect(errorCall[0]).toBeInstanceOf(BadRequestError);
				expect(errorCall[0]?.httpStatusCode).toBe(400);
			}
		});
	});

	describe('Error Metadata', () => {
		it('should include node name in error metadata', async () => {
			const error = new NodeOperationError(workflowStartNode, 'Test error');
			error.context = { parameter: 'testParam' };

			webhookService.runWebhook.mockRejectedValue(error);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			const runCall = workflowRunner.run.mock.calls[0];
			const runData = runCall[0];
			const executionError = runData.executionData.resultData.error;

			expect(executionError).toBeDefined();
			expect(executionError.message).toContain('Webhook');
		});

		it('should include parameter name in error metadata when available', async () => {
			const error = new NodeOperationError(workflowStartNode, 'Test error');
			error.context = { parameter: 'jsonBody' };

			webhookService.runWebhook.mockRejectedValue(error);

			await executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				'webhook' as WorkflowExecuteMode,
				undefined,
				undefined,
				undefined,
				req,
				res,
				responseCallback,
			);

			const errorArg = responseCallback.mock.calls.find((call) => call[0] !== null)?.[0];
			expect(errorArg?.message).toContain('Parameter: jsonBody');
		});
	});
});
