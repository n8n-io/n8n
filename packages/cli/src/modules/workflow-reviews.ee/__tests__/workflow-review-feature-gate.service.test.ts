import type { LicenseState } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { WORKFLOW_REVIEWS_ENV_FEATURE_FLAG } from '@/constants/workflow-reviews';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';

describe('WorkflowReviewFeatureGate', () => {
	const originalEnvValue = process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG];
	const licenseState = mock<LicenseState>();
	const policyService = mock<WorkflowReviewPolicyService>();
	const featureGate = new WorkflowReviewFeatureGate(licenseState, policyService);

	beforeEach(() => {
		vi.resetAllMocks();
		process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG] = 'true';
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		policyService.get.mockResolvedValue({ enabled: true });
	});

	afterAll(() => {
		if (originalEnvValue === undefined) {
			delete process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG];
		} else {
			process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG] = originalEnvValue;
		}
	});

	test('is unavailable when the environment flag is off', async () => {
		delete process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG];

		await expect(featureGate.isAvailable()).resolves.toBe(false);
		expect(policyService.get).not.toHaveBeenCalled();
	});

	test('is unavailable when the license is missing', async () => {
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(false);

		await expect(featureGate.isAvailable()).resolves.toBe(false);
		expect(policyService.get).not.toHaveBeenCalled();
	});

	test('is unavailable when the instance policy is disabled', async () => {
		policyService.get.mockResolvedValue({ enabled: false });

		await expect(featureGate.isAvailable()).resolves.toBe(false);
	});

	test('is available when the environment, license, and policy all allow reviews', async () => {
		await expect(featureGate.isAvailable()).resolves.toBe(true);
	});
});
