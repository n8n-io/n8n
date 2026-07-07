import { mockInstance } from '@n8n/backend-test-utils';
import { LicenseState } from '@n8n/backend-common';
import type { Settings } from '@n8n/db';
import { SettingsRepository } from '@n8n/db';

import {
	WORKFLOW_REVIEW_POLICY_SETTINGS_KEY,
	WORKFLOW_REVIEWS_ENV_FEATURE_FLAG,
} from '@/constants/workflow-reviews';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

describe('WorkflowReviewPolicyService', () => {
	const settingsRepository = mockInstance(SettingsRepository);
	const licenseState = mockInstance(LicenseState);
	const service = new WorkflowReviewPolicyService(settingsRepository, licenseState);
	const originalWorkflowReviewsFlag = process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG];

	beforeEach(() => {
		vi.clearAllMocks();
		process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG] = 'true';
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
	});

	afterEach(() => {
		if (originalWorkflowReviewsFlag === undefined) {
			delete process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG];
		} else {
			process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG] = originalWorkflowReviewsFlag;
		}
	});

	describe('isAvailable', () => {
		it('requires the license and environment feature flag', () => {
			expect(service.isAvailable()).toBe(true);

			licenseState.isWorkflowReviewsLicensed.mockReturnValue(false);
			expect(service.isAvailable()).toBe(false);

			licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
			process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG] = 'false';
			expect(service.isAvailable()).toBe(false);
		});
	});

	describe('get', () => {
		it('returns undefined without reading settings when unavailable', async () => {
			licenseState.isWorkflowReviewsLicensed.mockReturnValue(false);

			const policy = await service.get();

			expect(policy).toBeUndefined();
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('returns the default policy when no setting exists', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			const policy = await service.get();

			expect(settingsRepository.findByKey).toHaveBeenCalledWith(WORKFLOW_REVIEW_POLICY_SETTINGS_KEY);
			expect(policy).toEqual({ enabled: false });
		});

		it('returns the stored policy when it is valid', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ enabled: true }),
			} as Settings);

			const policy = await service.get();

			expect(policy).toEqual({ enabled: true });
		});
	});
});
