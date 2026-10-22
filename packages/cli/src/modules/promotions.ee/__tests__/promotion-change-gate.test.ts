import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { CredentialsRepository, User, VariablesRepository, WorkflowRepository } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { DataTableSerializer } from '@/modules/n8n-packages/entities/data-table/data-table.serializer';
import type { TagImporter } from '@/modules/n8n-packages/entities/tag/tag-importer';
import type { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';

import { PromotionChangeService } from '../promotion-change.service';
import type { PromotionEnvironmentResolver } from '../promotion-environment.resolver';
import type { PromotionReviewGateService } from '../promotion-review-gate.service';
import type { PromotionsService } from '../promotions.service';
import type { PromotionOperationInput } from '../promotions.types';

const userWith = (...scopes: string[]) =>
	({ role: { slug: 'test', scopes: scopes.map((slug) => ({ slug })) } }) as unknown as User;

describe('PromotionChangeService.getPreview review gate', () => {
	const environmentResolver = mock<PromotionEnvironmentResolver>();
	const reviewGate = mock<PromotionReviewGateService>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new PromotionChangeService(
		mock<PromotionsService>(),
		mock<N8nPackagesService>(),
		mock<WorkflowRepository>(),
		mock<VariablesRepository>(),
		mock<CredentialsRepository>(),
		mock<TagImporter>(),
		mock<DataTableService>(),
		mock<DataTableSerializer>(),
		mock<ModuleRegistry>(),
		environmentResolver,
		reviewGate,
		logger,
	);
	let compareProject: MockInstance<() => Promise<never>>;
	const query = { sort: 'name', order: 'asc' } as const;

	beforeEach(() => {
		// Spy per test: the config restores spies between tests.
		compareProject = vi
			.spyOn(service as unknown as { compareProject: () => Promise<never> }, 'compareProject')
			.mockRejectedValue(new Error('compare ran'));
		environmentResolver.resolveForProject.mockReset();
		reviewGate.findPromoteBlocker.mockReset();
		environmentResolver.resolveForProject.mockResolvedValue(
			mock<PromotionOperationInput>({
				environmentId: 'env-1',
				config: {
					direction: 'promote',
					settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
				},
			}),
		);
	});

	it('returns an empty preview with the blocker and skips the git work', async () => {
		reviewGate.findPromoteBlocker.mockResolvedValue({ code: 'reviewOpen', reviewId: 'review-1' });

		const preview = await service.getPreview(
			userWith('gitConnection:push'),
			'project-1',
			'promote',
			query,
		);

		expect(preview).toEqual({
			commitSha: null,
			source: { environmentId: 'env-1', branchName: 'staging' },
			changes: [],
			resources: [],
			dependencies: [],
			blocker: { code: 'reviewOpen', reviewId: 'review-1' },
		});
		expect(reviewGate.findPromoteBlocker).toHaveBeenCalledWith('project-1', 'env-1');
		expect(compareProject).not.toHaveBeenCalled();
	});

	it('does not run the gate for an apply preview', async () => {
		await expect(
			service.getPreview(userWith('gitConnection:pull'), 'project-1', 'apply', query),
		).rejects.toThrow('compare ran');

		expect(environmentResolver.resolveForProject).not.toHaveBeenCalled();
		expect(reviewGate.findPromoteBlocker).not.toHaveBeenCalled();
	});

	it('checks the permission before the gate', async () => {
		await expect(service.getPreview(userWith(), 'project-1', 'promote', query)).rejects.toThrow(
			ForbiddenError,
		);

		expect(environmentResolver.resolveForProject).not.toHaveBeenCalled();
		expect(reviewGate.findPromoteBlocker).not.toHaveBeenCalled();
	});
});
