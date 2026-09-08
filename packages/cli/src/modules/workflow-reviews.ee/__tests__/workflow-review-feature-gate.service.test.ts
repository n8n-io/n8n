import type { LicenseState } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';

describe('WorkflowReviewFeatureGate', () => {
	const licenseState = mock<LicenseState>();
	const policyService = mock<WorkflowReviewPolicyService>();
	const featureGate = new WorkflowReviewFeatureGate(licenseState, policyService);

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		policyService.get.mockResolvedValue({ enabled: true });
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

	test('is available when the license and policy both allow reviews', async () => {
		await expect(featureGate.isAvailable()).resolves.toBe(true);
	});
});
