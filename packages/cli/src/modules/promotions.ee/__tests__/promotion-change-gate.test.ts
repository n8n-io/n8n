import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type {
	CredentialsRepository,
	Role,
	Scope as DbScope,
	SharedWorkflowRepository,
	User,
	VariablesRepository,
	WorkflowRepository,
} from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
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

const userWith = (...scopes: Scope[]) =>
	mock<User>({
		role: mock<Role>({ scopes: scopes.map((slug) => mock<DbScope>({ slug })) }),
	});
const pusher = userWith('gitConnection:push');
const puller = userWith('gitConnection:pull');
const nobody = userWith();

const branched = (createBranchOnPromotion: boolean) =>
	mock<PromotionOperationInput>({
		environmentId: 'env-1',
		config: {
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion },
		},
	});

describe('PromotionChangeService.getPreview review gate', () => {
	const promotionsService = mock<PromotionsService>();
	const environmentResolver = mock<PromotionEnvironmentResolver>();
	const reviewGate = mock<PromotionReviewGateService>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new PromotionChangeService(
		promotionsService,
		mock<N8nPackagesService>(),
		mock<WorkflowRepository>(),
		mock<SharedWorkflowRepository>(),
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
	const query = { sort: 'name', order: 'asc' } as const;

	beforeEach(() => {
		// The Git work starts with this read, so a test that expects no Git work asserts it is not called.
		promotionsService.readBranchPackage.mockReset();
		promotionsService.readBranchPackage.mockRejectedValue(new Error('compare ran'));
		environmentResolver.resolveForProject.mockReset();
		environmentResolver.resolveForProject.mockResolvedValue(branched(true));
		reviewGate.findPromoteBlocker.mockReset();
	});

	it('returns an empty preview with the blocker and skips the git work', async () => {
		reviewGate.findPromoteBlocker.mockResolvedValue({ code: 'reviewOpen', reviewId: 'review-1' });

		const preview = await service.getPreview(pusher, 'project-1', 'promote', query);

		expect(preview).toEqual({
			commitSha: null,
			source: { environmentId: 'env-1', branchName: 'staging' },
			changes: [],
			resources: [],
			dependencies: [],
			blocker: { code: 'reviewOpen', reviewId: 'review-1' },
		});
		expect(reviewGate.findPromoteBlocker).toHaveBeenCalledWith('project-1', 'env-1');
		expect(promotionsService.readBranchPackage).not.toHaveBeenCalled();
	});

	it('does not run the gate when the promote pushes directly', async () => {
		environmentResolver.resolveForProject.mockResolvedValue(branched(false));

		await expect(service.getPreview(pusher, 'project-1', 'promote', query)).rejects.toThrow(
			'compare ran',
		);

		expect(reviewGate.findPromoteBlocker).not.toHaveBeenCalled();
	});

	it('does not run the gate for an apply preview', async () => {
		await expect(service.getPreview(puller, 'project-1', 'apply', query)).rejects.toThrow(
			'compare ran',
		);

		expect(environmentResolver.resolveForProject).not.toHaveBeenCalled();
		expect(reviewGate.findPromoteBlocker).not.toHaveBeenCalled();
	});

	it('checks the permission before the gate', async () => {
		await expect(service.getPreview(nobody, 'project-1', 'promote', query)).rejects.toThrow(
			ForbiddenError,
		);

		expect(environmentResolver.resolveForProject).not.toHaveBeenCalled();
		expect(reviewGate.findPromoteBlocker).not.toHaveBeenCalled();
		expect(promotionsService.readBranchPackage).not.toHaveBeenCalled();
	});
});
