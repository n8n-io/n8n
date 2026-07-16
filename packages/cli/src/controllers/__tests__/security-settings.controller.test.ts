import type { UpdateSecuritySettingsDto } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { SecuritySettingsService } from '@/services/security-settings.service';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

import { SecuritySettingsController } from '../security-settings.controller';

describe('SecuritySettingsController', () => {
	const securitySettingsService = mock<SecuritySettingsService>();
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const licenseState = mock<LicenseState>();
	const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
		securityPolicyManagedByEnv: false,
	});

	const controller = new SecuritySettingsController(
		securitySettingsService,
		workflowReviewPolicyService,
		licenseState,
		instanceSettingsLoaderConfig,
	);

	const req = {
		user: {
			id: 'user-1',
			email: 'admin@n8n.io',
			firstName: 'Admin',
			lastName: 'User',
			role: { slug: 'global:owner' },
		},
	} as unknown as AuthenticatedRequest;

	const originalWorkflowReviewsFlag = process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS;

	beforeEach(() => {
		vi.clearAllMocks();
		instanceSettingsLoaderConfig.securityPolicyManagedByEnv = false;
		delete process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS;
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(false);
	});

	afterAll(() => {
		if (originalWorkflowReviewsFlag === undefined) {
			delete process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS;
		} else {
			process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = originalWorkflowReviewsFlag;
		}
	});

	describe('getSecuritySettings', () => {
		it('delegates to the service and adds managedByEnv', async () => {
			securitySettingsService.getSecuritySettings.mockResolvedValue({
				personalSpacePublishing: true,
				personalSpaceSharing: false,
				publishedPersonalWorkflowsCount: 5,
				sharedPersonalWorkflowsCount: 12,
				sharedPersonalCredentialsCount: 3,
				redactionEnforcement: { floor: 'production' },
			});

			const result = await controller.getSecuritySettings(req, mock());

			expect(result).toEqual({
				personalSpacePublishing: true,
				personalSpaceSharing: false,
				publishedPersonalWorkflowsCount: 5,
				sharedPersonalWorkflowsCount: 12,
				sharedPersonalCredentialsCount: 3,
				redactionEnforcement: { floor: 'production' },
				managedByEnv: false,
			});
		});

		it('reflects managedByEnv when set', async () => {
			instanceSettingsLoaderConfig.securityPolicyManagedByEnv = true;
			securitySettingsService.getSecuritySettings.mockResolvedValue({
				personalSpacePublishing: true,
				personalSpaceSharing: true,
				publishedPersonalWorkflowsCount: 0,
				sharedPersonalWorkflowsCount: 0,
				sharedPersonalCredentialsCount: 0,
				redactionEnforcement: { floor: 'off' },
			});

			const result = await controller.getSecuritySettings(req, mock());

			expect(result.managedByEnv).toBe(true);
		});

		it('includes workflowReviews when licensed and dev flag is on', async () => {
			process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
			licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
			securitySettingsService.getSecuritySettings.mockResolvedValue({
				personalSpacePublishing: true,
				personalSpaceSharing: true,
				publishedPersonalWorkflowsCount: 0,
				sharedPersonalWorkflowsCount: 0,
				sharedPersonalCredentialsCount: 0,
				redactionEnforcement: { floor: 'off' },
			});
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });

			const result = await controller.getSecuritySettings(req, mock());

			expect(result).toMatchObject({ workflowReviews: { enabled: true } });
		});
	});

	describe('updateSecuritySettings', () => {
		const dto = (overrides: Partial<UpdateSecuritySettingsDto> = {}) =>
			overrides as UpdateSecuritySettingsDto;

		it('delegates the writable subset to the service with the request user', async () => {
			securitySettingsService.updateSecuritySettings.mockResolvedValue({
				personalSpacePublishing: false,
				redactionEnforcement: { floor: 'all' },
			});

			const result = await controller.updateSecuritySettings(
				req,
				mock(),
				dto({ personalSpacePublishing: false, redactionEnforcement: { floor: 'all' } }),
			);

			expect(securitySettingsService.updateSecuritySettings).toHaveBeenCalledWith(
				{
					personalSpacePublishing: false,
					personalSpaceSharing: undefined,
					redactionEnforcement: { floor: 'all' },
				},
				req.user,
			);
			expect(result).toEqual({
				personalSpacePublishing: false,
				redactionEnforcement: { floor: 'all' },
			});
		});

		it('throws ForbiddenError when settings are managed by env', async () => {
			instanceSettingsLoaderConfig.securityPolicyManagedByEnv = true;

			await expect(
				controller.updateSecuritySettings(req, mock(), dto({ personalSpacePublishing: false })),
			).rejects.toThrow(ForbiddenError);
			expect(securitySettingsService.updateSecuritySettings).not.toHaveBeenCalled();
		});

		it('updates workflowReviews and emits its policy event when available', async () => {
			process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
			licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
			securitySettingsService.updateSecuritySettings.mockResolvedValue({});
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });
			workflowReviewPolicyService.set.mockResolvedValue({ enabled: true });

			const result = await controller.updateSecuritySettings(
				req,
				mock(),
				dto({ workflowReviews: { enabled: true } }),
			);

			expect(workflowReviewPolicyService.set).toHaveBeenCalledWith(true);
			expect(result).toMatchObject({ workflowReviews: { enabled: true } });
			expect(securitySettingsService.emitInstancePolicyUpdated).toHaveBeenCalledWith(req.user, {
				settingName: 'workflow_reviews',
				value: true,
			});
		});

		it('rejects workflowReviews when the feature is unavailable', async () => {
			await expect(
				controller.updateSecuritySettings(req, mock(), dto({ workflowReviews: { enabled: true } })),
			).rejects.toThrow(ForbiddenError);
			expect(workflowReviewPolicyService.set).not.toHaveBeenCalled();
		});
	});
});
