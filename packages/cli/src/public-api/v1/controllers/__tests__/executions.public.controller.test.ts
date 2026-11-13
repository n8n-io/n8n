import type {
	GetExecutionQueryDto,
	ListExecutionsQueryDto,
	RetryExecutionPublicDto,
} from '@n8n/api-types';
import type { ExecutionRedactionServiceProxy, WorkflowSharingService } from '@n8n/backend-services';
import type { IExecutionResponse, OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { ExecutionService } from '@/executions/execution.service';
import type { PublicApiRequest } from '@/public-api/public-api-client';

import { ExecutionsPublicController } from '../executions.public.controller';

describe('ExecutionsPublicController', () => {
	let controller: ExecutionsPublicController;
	const executionService = mock<ExecutionService>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const executionRedactionServiceProxy = mock<ExecutionRedactionServiceProxy>();
	const stop = new Error('Stopping for test');

	const request = (ctx?: OperationContext) => {
		const req = mock<PublicApiRequest>({
			ip: '127.0.0.1',
			headers: {},
			publicApiClient: 'other',
		});
		// Assign after creation, so the request keeps the same object.
		req.ctx = ctx;
		return req;
	};

	const swallowStop = (e: unknown) => {
		if (e !== stop) throw e;
	};

	const redactableExecution = () =>
		mock<IExecutionResponse>({
			id: 'execution-1',
			workflowId: 'workflow-1',
			data: {},
			workflowData: {},
		});

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new ExecutionsPublicController(
			executionService,
			workflowSharingService,
			executionRedactionServiceProxy,
			mock(), // executionsConfig
			mock(), // eventService
		);
		workflowSharingService.getSharedWorkflowIdsForScopes.mockResolvedValue(['workflow-1']);
	});

	describe('retryExecution', () => {
		const retryExecution = async (ctx?: OperationContext) =>
			await controller
				.retryExecution(request(ctx), mock<Response>(), 'execution-1', {
					loadWorkflow: false,
				} as RetryExecutionPublicDto)
				.catch(swallowStop);

		const ctxPassed = () => executionService.retry.mock.calls[0][1];

		beforeEach(() => {
			executionService.retry.mockRejectedValue(stop);
		});

		it('passes the operation context of the request to the retry', async () => {
			const ctx: OperationContext = {
				security: mock<SecurityContext>({ subIdentityId: 'login-1' }),
			};

			await retryExecution(ctx);

			expect(ctxPassed()).toBe(ctx);
		});

		it('passes no operation context when the request has none', async () => {
			await retryExecution(undefined);

			expect(ctxPassed()).toBeUndefined();
		});
	});

	describe('getExecutions', () => {
		const getExecutions = async (ctx?: OperationContext) =>
			await controller
				.getExecutions(request(ctx), mock<Response>(), {
					limit: 10,
					includeData: true,
					redactExecutionData: false,
				} as ListExecutionsQueryDto)
				.catch(swallowStop);

		const ctxPassed = () => executionRedactionServiceProxy.processExecutions.mock.calls[0][1].ctx;

		beforeEach(() => {
			executionService.findManyAndCount.mockResolvedValue({
				executions: [redactableExecution()],
				count: 1,
			});
			executionRedactionServiceProxy.processExecutions.mockRejectedValue(stop);
		});

		it('passes the operation context of the request to the redaction', async () => {
			const ctx: OperationContext = {
				security: mock<SecurityContext>({ subIdentityId: 'login-1' }),
			};

			await getExecutions(ctx);

			expect(ctxPassed()).toBe(ctx);
		});

		it('passes no operation context when the request has none', async () => {
			await getExecutions(undefined);

			expect(ctxPassed()).toBeUndefined();
		});
	});

	describe('getExecution', () => {
		const getExecution = async (ctx?: OperationContext) =>
			await controller
				.getExecution(request(ctx), mock<Response>(), 'execution-1', {
					includeData: true,
					redactExecutionData: false,
				} as GetExecutionQueryDto)
				.catch(swallowStop);

		const ctxPassed = () => executionRedactionServiceProxy.processExecution.mock.calls[0][1].ctx;

		beforeEach(() => {
			executionService.findOneInWorkflows.mockResolvedValue(redactableExecution());
			executionRedactionServiceProxy.processExecution.mockRejectedValue(stop);
		});

		it('passes the operation context of the request to the redaction', async () => {
			const ctx: OperationContext = {
				security: mock<SecurityContext>({ subIdentityId: 'login-1' }),
			};

			await getExecution(ctx);

			expect(ctxPassed()).toBe(ctx);
		});

		it('passes no operation context when the request has none', async () => {
			await getExecution(undefined);

			expect(ctxPassed()).toBeUndefined();
		});
	});
});
