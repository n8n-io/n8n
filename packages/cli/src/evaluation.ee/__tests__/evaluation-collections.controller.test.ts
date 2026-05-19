import { EVAL_COLLECTIONS_FLAG } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { PostHogClient } from '@/posthog';

import { EvaluationCollectionsController } from '../evaluation-collections.controller.ee';
import type { EvaluationCollectionService } from '../evaluation-collection.service';

describe('EvaluationCollectionsController', () => {
	let controller: EvaluationCollectionsController;
	let service: jest.Mocked<EvaluationCollectionService>;
	let postHogClient: jest.Mocked<PostHogClient>;
	let logger: jest.Mocked<Logger>;

	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		service = mock<EvaluationCollectionService>();
		postHogClient = mock<PostHogClient>();
		logger = mock<Logger>();
		// Default: flag ON for the user. Each test that needs flag-off semantics
		// overrides this with `mockResolvedValueOnce({})` (no flag entry).
		postHogClient.getFeatureFlags.mockResolvedValue({
			eval_collections: true,
		} as Record<string, boolean>);
		controller = new EvaluationCollectionsController(service, postHogClient, logger);
	});

	type WithBody<P, B> = AuthenticatedRequest<P> & { body: B };

	function makeReq<P extends Record<string, unknown>, B = unknown>(
		params: P,
		body: B = {} as B,
		query: Record<string, unknown> = {},
	): WithBody<P, B> {
		return { user, params, body, query } as unknown as WithBody<P, B>;
	}

	describe('flag gating', () => {
		it.each([
			['list', async () => await controller.list(makeReq({ workflowId: 'wf-1' }))],
			[
				'get',
				async () => await controller.get(makeReq({ workflowId: 'wf-1', collectionId: 'col-1' })),
			],
			[
				'create',
				async () =>
					await controller.create(makeReq({ workflowId: 'wf-1' }), undefined, {} as never),
			],
			[
				'update',
				async () =>
					await controller.update(
						makeReq({ workflowId: 'wf-1', collectionId: 'col-1' }),
						undefined,
						{} as never,
					),
			],
			[
				'delete',
				async () => await controller.delete(makeReq({ workflowId: 'wf-1', collectionId: 'col-1' })),
			],
			[
				'addRun',
				async () =>
					await controller.addRun(
						makeReq({ workflowId: 'wf-1', collectionId: 'col-1' }),
						undefined,
						{ testRunId: 'tr-x' },
					),
			],
			[
				'removeRun',
				async () =>
					await controller.removeRun(
						makeReq({ workflowId: 'wf-1', collectionId: 'col-1', runId: 'tr-x' }),
					),
			],
			[
				'listVersions',
				async () =>
					await controller.listVersions(
						makeReq({ workflowId: 'wf-1' }, {}, { evaluationConfigId: 'cfg-1' }),
					),
			],
		])('rejects %s with 404 when flag is off', async (_name, call) => {
			postHogClient.getFeatureFlags.mockResolvedValueOnce({});
			await expect(call()).rejects.toThrow(NotFoundError);
		});

		it('treats a PostHog outage as flag-off (fail-open to 404, not 500)', async () => {
			postHogClient.getFeatureFlags.mockRejectedValueOnce(new Error('posthog timeout'));
			await expect(controller.list(makeReq({ workflowId: 'wf-1' }))).rejects.toThrow(NotFoundError);
		});

		it('uses the spec-declared flag id', () => {
			// Future-proofs the rollout: if anyone renames the flag without
			// also updating the spec/PostHog, this test fails immediately.
			expect(EVAL_COLLECTIONS_FLAG).toBe('eval_collections');
		});
	});

	describe('list', () => {
		it('delegates to service when flag on', async () => {
			service.listCollections.mockResolvedValueOnce([]);
			await controller.list(makeReq({ workflowId: 'wf-1' }));
			expect(service.listCollections).toHaveBeenCalledWith('wf-1');
		});
	});

	describe('create', () => {
		it('delegates to service with payload + user', async () => {
			service.createCollection.mockResolvedValueOnce({
				record: { id: 'col-1' } as never,
				runsStartedIds: ['tr-1'],
			});

			const payload = {
				name: 'c',
				evaluationConfigId: 'cfg-1',
				versions: [{ workflowVersionId: 'wfv-1' }],
			} as never;
			await controller.create(makeReq({ workflowId: 'wf-1' }), undefined, payload);

			expect(service.createCollection).toHaveBeenCalledWith(user, 'wf-1', payload);
		});
	});

	describe('listVersions', () => {
		it('rejects requests missing evaluationConfigId with 400', async () => {
			await expect(
				controller.listVersions(makeReq({ workflowId: 'wf-1' }, {}, {})),
			).rejects.toThrow(BadRequestError);
		});
	});

	// Route-access regression: every authenticated route on this controller
	// must carry a `@ProjectScope('workflow:*')` decorator. The skill at
	// `.claude/skills/protect-endpoints` calls this out as a hard rule —
	// adding a route without a scope is an IDOR/permission-bypass risk that
	// this test catches at compile time of the test suite.
	describe('route access scopes', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			EvaluationCollectionsController as never,
		);
		const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
			handlerName,
			route,
		}));

		// Map each handler to the exact scope we expect. `create` schedules
		// executions → `workflow:execute`. Mutations → `workflow:update`.
		// Reads → `workflow:read`. Anything else would be a regression.
		const expectedScopes: Record<string, string> = {
			list: 'workflow:read',
			get: 'workflow:read',
			create: 'workflow:execute',
			update: 'workflow:update',
			delete: 'workflow:update',
			addRun: 'workflow:update',
			removeRun: 'workflow:update',
			listVersions: 'workflow:read',
		};

		it.each(routeCases)(
			'$handlerName carries the expected ProjectScope',
			({ handlerName, route }) => {
				expect(route.accessScope).toBeDefined();
				expect(route.accessScope?.globalOnly).toBe(false);
				expect(route.accessScope?.scope).toBe(expectedScopes[handlerName]);
			},
		);

		it('covers every public handler on the controller', () => {
			// Sanity check: if a new route is added without updating
			// `expectedScopes` this catches it (else the `.each` above would
			// silently pass with `undefined`).
			const handlerNames = routeCases.map((r) => r.handlerName).sort();
			expect(handlerNames).toEqual(Object.keys(expectedScopes).sort());
		});
	});
});
