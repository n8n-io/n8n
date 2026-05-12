import { EVAL_COLLECTIONS_FLAG } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { PostHogClient } from '@/posthog';

import { EvalInsightsController } from '../eval-insights.controller.ee';
import type { EvalInsightsService } from '../eval-insights.service';

describe('EvalInsightsController', () => {
	let controller: EvalInsightsController;
	let service: jest.Mocked<EvalInsightsService>;
	let postHogClient: jest.Mocked<PostHogClient>;
	let logger: jest.Mocked<Logger>;

	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		service = mock<EvalInsightsService>();
		postHogClient = mock<PostHogClient>();
		logger = mock<Logger>();
		postHogClient.getFeatureFlags.mockResolvedValue({
			[EVAL_COLLECTIONS_FLAG]: true,
		} as Record<string, boolean>);
		controller = new EvalInsightsController(service, postHogClient, logger);
	});

	function makeReq(params: { workflowId: string; collectionId: string }) {
		return { user, params } as unknown as AuthenticatedRequest<typeof params>;
	}

	describe('flag gating', () => {
		it('returns 404 when the eval_collections flag is off', async () => {
			postHogClient.getFeatureFlags.mockResolvedValueOnce({});
			await expect(
				controller.generate(makeReq({ workflowId: 'wf-1', collectionId: 'col-1' })),
			).rejects.toThrow(NotFoundError);
			expect(service.generateInsights).not.toHaveBeenCalled();
		});

		it('fails open to 404 on PostHog outage rather than 500ing', async () => {
			postHogClient.getFeatureFlags.mockRejectedValueOnce(new Error('posthog timeout'));
			await expect(
				controller.generate(makeReq({ workflowId: 'wf-1', collectionId: 'col-1' })),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('happy path', () => {
		it('delegates to the service with user + workflowId + collectionId', async () => {
			const response = {
				generatedAt: '2026-04-01T00:00:00.000Z',
				modelUsed: 'deterministic',
				status: 'fallback',
				insights: {
					winner: { versionLabel: 'A', headline: 'h', body: 'b' },
					regressions: [],
					suggestedNext: { headline: 'h', body: 'b', hypothesis: 'h' },
				},
			} as never;
			service.generateInsights.mockResolvedValueOnce(response);

			const result = await controller.generate(
				makeReq({ workflowId: 'wf-1', collectionId: 'col-1' }),
			);

			expect(result).toBe(response);
			expect(service.generateInsights).toHaveBeenCalledWith(user, 'wf-1', 'col-1');
		});
	});

	// Route-access regression: like the eval-collections controller, every
	// authenticated route must carry a `@ProjectScope('workflow:*')`
	// decorator. The skill at `.claude/skills/protect-endpoints` calls this
	// out as a hard rule. Insights are a read-only operation on the
	// workflow's eval data.
	describe('route access scopes', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			EvalInsightsController as never,
		);
		const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
			handlerName,
			route,
		}));

		const expectedScopes: Record<string, string> = {
			generate: 'workflow:read',
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
			const handlerNames = routeCases.map((r) => r.handlerName).sort();
			expect(handlerNames).toEqual(Object.keys(expectedScopes).sort());
		});
	});
});
