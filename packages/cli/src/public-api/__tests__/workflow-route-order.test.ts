import '../v1/controllers';

import type { EventService } from '@n8n/backend-services';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import express from 'express';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';
import { PublicApiControllerRegistry } from '@/public-api/public-api-controller.registry';
import { EvaluationsPublicController } from '@/public-api/v1/controllers/evaluations.public.controller';
import { WorkflowsPublicController } from '@/public-api/v1/controllers/workflows.public.controller';
import type { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import type { LastActiveAtService } from '@/services/last-active-at.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

it('mounts evaluation routes before the workflow version alias and keeps specific workflow routes first', async () => {
	const registered = Container.get(ControllerRegistryMetadata);
	const controllers = [...registered.controllerClasses].filter(
		(controller) =>
			controller === EvaluationsPublicController || controller === WorkflowsPublicController,
	);
	expect(controllers).toEqual([EvaluationsPublicController, WorkflowsPublicController]);

	const workflowRoutes = [
		...registered.getControllerMetadata(WorkflowsPublicController as never).routes.keys(),
	];
	expect(workflowRoutes.indexOf('getWorkflowHistory')).toBeLessThan(
		workflowRoutes.indexOf('getDeprecatedWorkflowVersion'),
	);
	expect(workflowRoutes.indexOf('getWorkflowTags')).toBeLessThan(
		workflowRoutes.indexOf('getDeprecatedWorkflowVersion'),
	);
	expect(workflowRoutes.at(-1)).toBe('getDeprecatedWorkflowVersion');

	const metadata = new ControllerRegistryMetadata();
	for (const controller of controllers) {
		Object.assign(
			metadata.getControllerMetadata(controller),
			registered.getControllerMetadata(controller),
		);
	}

	const workflows = mock<WorkflowsPublicController>();
	workflows.getWorkflowHistory.mockRejectedValue(new NotFoundError('history route'));
	workflows.getWorkflowTags.mockRejectedValue(new NotFoundError('tags route'));
	workflows.getDeprecatedWorkflowVersion.mockRejectedValue(new NotFoundError('version route'));
	const evaluations = mock<EvaluationsPublicController>();
	evaluations.getTestRuns.mockRejectedValue(new NotFoundError('test runs route'));
	Container.set(WorkflowsPublicController, workflows);
	Container.set(EvaluationsPublicController, evaluations);

	vi.mocked(userHasScopes).mockResolvedValue(true);
	const user = mock<User>({ id: 'user-1' });
	const auth = mock<AuthStrategyRegistry>();
	auth.authenticate.mockImplementation(async (req: AuthenticatedRequest) => {
		req.user = user;
		req.tokenGrant = {
			scopes: [],
			apiKeyScopes: ['workflow:read', 'workflowTags:list', 'testRun:list'],
			subject: user,
		};
		return true;
	});
	const events = mock<EventService>();
	const lastActiveAt = mock<LastActiveAtService>();
	lastActiveAt.updateLastActiveIfStale.mockResolvedValue(undefined);
	const app = express();
	const router = express.Router({ mergeParams: true });
	new PublicApiControllerRegistry(metadata, auth, lastActiveAt, events).activate(router, 'v1');
	app.use('/api/v1', router);

	for (const [path, message] of [
		['history', 'history route'],
		['tags', 'tags route'],
		['test-runs', 'test runs route'],
		['version-1', 'version route'],
	]) {
		events.emit.mockClear();
		const response = await request(app).get(`/api/v1/workflows/workflow-1/${path}`);
		expect(response.statusCode, `${path}: ${JSON.stringify(response.body)}`).toBe(404);
		expect(response.body.message).toBe(message);
		expect(events.emit.mock.calls.filter(([name]) => name === 'public-api-invoked')).toHaveLength(
			1,
		);
	}

	expect(workflows.getWorkflowHistory).toHaveBeenCalledOnce();
	expect(workflows.getWorkflowTags).toHaveBeenCalledOnce();
	expect(evaluations.getTestRuns).toHaveBeenCalledOnce();
	expect(workflows.getDeprecatedWorkflowVersion).toHaveBeenCalledOnce();
});
