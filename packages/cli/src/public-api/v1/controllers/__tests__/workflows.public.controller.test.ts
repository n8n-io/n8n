import type {
	CreateWorkflowPublicDto,
	PublishWorkflowPublicDto,
	UpdateWorkflowPublicDto,
	UpdateWorkflowQueryDto,
} from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@n8n/errors';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import type { PublicApiRequest } from '@/public-api/public-api-client';
import type { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowsPublicController } from '../workflows.public.controller';

describe('WorkflowsPublicController', () => {
	let controller: WorkflowsPublicController;
	const workflowService = mock<WorkflowService>();
	const workflowCreationService = mock<WorkflowCreationService>();

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new WorkflowsPublicController(
			mock(), // workflowHistoryService
			mock(), // workflowFinderService
			workflowCreationService,
			workflowService,
			mock(), // enterpriseWorkflowService
			mock(), // eventService
			mock(), // globalConfig
			mock(), // tagService
			mock(), // redactionEnforcementService
			mock(), // workflowDependencyQueryService
		);
	});

	// mock() wraps nested objects in a proxy, so set ctx after creation to keep its identity.
	const requestWith = (ctx?: OperationContext) => {
		const req = mock<PublicApiRequest>({ publicApiClient: 'other' });
		req.ctx = ctx;
		return req;
	};

	const updateWorkflow = async () =>
		await controller.updateWorkflow(
			mock<PublicApiRequest>(),
			mock<Response>(),
			'workflow-id',
			mock<UpdateWorkflowPublicDto>(),
			mock<UpdateWorkflowQueryDto>(),
		);

	describe('updateWorkflow error mapping', () => {
		// The legacy handler answered 400 with the message for anything it did not recognise.
		// Integration tests cover the errors the service raises on purpose; these two cover what
		// happens when it raises something else.
		it('answers 400 for an unexpected error', async () => {
			workflowService.update.mockRejectedValue(new Error('the database went away'));

			await expect(updateWorkflow()).rejects.toThrow(BadRequestError);
			await expect(updateWorkflow()).rejects.toThrow('the database went away');
		});

		it('rethrows a value that is not an Error', async () => {
			workflowService.update.mockRejectedValue('not an error object');

			await expect(updateWorkflow()).rejects.toBe('not an error object');
		});

		it('rethrows a policy violation with its status and violations intact', async () => {
			const violation = {
				kind: 'node-type-unavailable',
				checkId: 'node-allowlist',
				message: 'Slack is not allowed',
			};
			workflowService.update.mockRejectedValue(new PolicyViolationError([violation]));

			const error = await updateWorkflow().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PolicyViolationError);
			expect((error as PolicyViolationError).httpStatusCode).toBe(403);
			expect((error as PolicyViolationError).meta.violations).toEqual([violation]);
		});
	});

	describe('createWorkflow', () => {
		const stop = new Error('Stopping for test');

		const createWorkflow = async (ctx?: OperationContext) =>
			await controller
				.createWorkflow(requestWith(ctx), mock<Response>(), {
					name: 'Test',
					nodes: [],
					connections: {},
					settings: {},
				} as unknown as CreateWorkflowPublicDto)
				.catch((e: unknown) => {
					if (e !== stop) throw e;
				});

		const ctxPassed = () => workflowCreationService.createWorkflow.mock.calls[0][3];

		beforeEach(() => {
			workflowCreationService.createWorkflow.mockRejectedValue(stop);
		});

		it('passes the request context to the workflow creation', async () => {
			const ctx: OperationContext = {
				security: mock<SecurityContext>({ subIdentityId: 'login-1' }),
			};

			await createWorkflow(ctx);

			expect(ctxPassed()).toBe(ctx);
		});

		it('passes no context when the request has none', async () => {
			await createWorkflow(undefined);

			expect(ctxPassed()).toBeUndefined();
		});
	});

	describe('request context on workflow changes', () => {
		const stop = new Error('Stopping for test');

		type Route = {
			route: string;
			call: (req: PublicApiRequest) => Promise<unknown>;
			arrange: () => void;
			ctxPassed: () => OperationContext | undefined;
		};

		const routes: Route[] = [
			{
				route: 'updateWorkflow',
				call: async (req) =>
					await controller.updateWorkflow(
						req,
						mock<Response>(),
						'workflow-id',
						{} as UpdateWorkflowPublicDto,
						{} as UpdateWorkflowQueryDto,
					),
				arrange: () => workflowService.update.mockRejectedValue(stop),
				ctxPassed: () => workflowService.update.mock.calls[0][4],
			},
			{
				route: 'publishWorkflow',
				call: async (req) =>
					await controller.publishWorkflow(req, mock<Response>(), 'workflow-id', {
						versionId: 'version-id',
					} as PublishWorkflowPublicDto),
				arrange: () => workflowService.activateWorkflow.mockRejectedValue(stop),
				ctxPassed: () => workflowService.activateWorkflow.mock.calls[0][3],
			},
			{
				route: 'unpublishWorkflow',
				call: async (req) =>
					await controller.unpublishWorkflow(req, mock<Response>(), 'workflow-id'),
				arrange: () => workflowService.deactivateWorkflow.mockRejectedValue(stop),
				ctxPassed: () => workflowService.deactivateWorkflow.mock.calls[0][3],
			},
			{
				route: 'archiveWorkflow',
				call: async (req) => await controller.archiveWorkflow(req, mock<Response>(), 'workflow-id'),
				arrange: () => workflowService.archiveForPublicApi.mockRejectedValue(stop),
				ctxPassed: () => workflowService.archiveForPublicApi.mock.calls[0][3],
			},
			{
				route: 'unarchiveWorkflow',
				call: async (req) =>
					await controller.unarchiveWorkflow(req, mock<Response>(), 'workflow-id'),
				arrange: () => workflowService.unarchiveForPublicApi.mockRejectedValue(stop),
				ctxPassed: () => workflowService.unarchiveForPublicApi.mock.calls[0][3],
			},
			{
				route: 'deleteWorkflow',
				call: async (req) => await controller.deleteWorkflow(req, mock<Response>(), 'workflow-id'),
				arrange: () => workflowService.deleteForPublicApi.mockRejectedValue(stop),
				ctxPassed: () => workflowService.deleteForPublicApi.mock.calls[0][3],
			},
		];

		// updateWorkflow wraps the sentinel in a BadRequestError, so accept any rejection here.
		const callRoute = async ({ call }: Route, ctx?: OperationContext) =>
			await call(requestWith(ctx)).catch(() => undefined);

		it.each(routes)('$route passes the request context to the service', async (route) => {
			route.arrange();
			const ctx: OperationContext = {
				security: mock<SecurityContext>({ subIdentityId: 'login-1' }),
			};

			await callRoute(route, ctx);

			expect(route.ctxPassed()).toBe(ctx);
		});

		it.each(routes)('$route passes no context when the request has none', async (route) => {
			route.arrange();

			await callRoute(route, undefined);

			expect(route.ctxPassed()).toBeUndefined();
		});
	});
});
