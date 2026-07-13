import { mockInstance } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';

import { SecuritySettingsService } from '@/services/security-settings.service';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('SecuritySettingsController', () => {
	const securitySettingsService = mockInstance(SecuritySettingsService);
	const workflowReviewPolicyService = mockInstance(WorkflowReviewPolicyService);
	const instanceSettingsLoaderConfig = mockInstance(InstanceSettingsLoaderConfig, {
		securityPolicyManagedByEnv: false,
	});

	const testServer = setupTestServer({ endpointGroups: ['security-settings'] });
	let ownerAgent: SuperAgentTest;

	const readResult = {
		personalSpacePublishing: true,
		personalSpaceSharing: false,
		publishedPersonalWorkflowsCount: 5,
		sharedPersonalWorkflowsCount: 12,
		sharedPersonalCredentialsCount: 3,
		redactionEnforcement: { floor: 'off' as const },
	};

	beforeAll(async () => {
		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		testServer.license.enable('feat:personalSpacePolicy');
		instanceSettingsLoaderConfig.securityPolicyManagedByEnv = false;
		securitySettingsService.getSecuritySettings.mockResolvedValue(readResult);
	});

	describe('GET /settings/security', () => {
		it('should return 403 when personalSpacePolicy license is not active', async () => {
			testServer.license.disable('feat:personalSpacePolicy');
			await ownerAgent.get('/settings/security').expect(403);
		});

		it('should return the delegated settings plus managedByEnv', async () => {
			const response = await ownerAgent.get('/settings/security').expect(200);

			expect(response.body).toEqual({
				data: {
					...readResult,
					managedByEnv: false,
				},
			});
			expect(securitySettingsService.getSecuritySettings).toHaveBeenCalledTimes(1);
		});

		it('should reflect managedByEnv when the policy is env-managed', async () => {
			instanceSettingsLoaderConfig.securityPolicyManagedByEnv = true;

			const response = await ownerAgent.get('/settings/security').expect(200);

			expect(response.body.data.managedByEnv).toBe(true);
		});

		it('should return 500 when the service throws', async () => {
			securitySettingsService.getSecuritySettings.mockRejectedValueOnce(new Error('boom'));

			await ownerAgent.get('/settings/security').expect(500);
		});
	});

	describe('POST /settings/security', () => {
		it('should return 403 when personalSpacePolicy license is not active', async () => {
			testServer.license.disable('feat:personalSpacePolicy');
			await ownerAgent
				.post('/settings/security')
				.send({ personalSpacePublishing: true })
				.expect(403);
		});

		it('should delegate the writable subset to the service and return the result', async () => {
			securitySettingsService.updateSecuritySettings.mockResolvedValue({
				personalSpacePublishing: false,
				redactionEnforcement: { floor: 'production' },
			});

			const response = await ownerAgent
				.post('/settings/security')
				.send({ personalSpacePublishing: false, redactionEnforcement: { floor: 'production' } })
				.expect(200);

			expect(response.body).toEqual({
				data: {
					personalSpacePublishing: false,
					redactionEnforcement: { floor: 'production' },
				},
			});
			expect(securitySettingsService.updateSecuritySettings).toHaveBeenCalledWith(
				{
					personalSpacePublishing: false,
					personalSpaceSharing: undefined,
					redactionEnforcement: { floor: 'production' },
				},
				expect.objectContaining({ id: expect.any(String) }),
			);
		});

		it('should reject invalid floor values with 400', async () => {
			await ownerAgent
				.post('/settings/security')
				.send({ redactionEnforcement: { floor: 'bogus' } })
				.expect(400);

			expect(securitySettingsService.updateSecuritySettings).not.toHaveBeenCalled();
		});

		describe('when securityPolicyManagedByEnv is true', () => {
			beforeEach(() => {
				instanceSettingsLoaderConfig.securityPolicyManagedByEnv = true;
			});

			it('should return 403 and not call the service', async () => {
				await ownerAgent
					.post('/settings/security')
					.send({ personalSpacePublishing: false })
					.expect(403);

				expect(securitySettingsService.updateSecuritySettings).not.toHaveBeenCalled();
			});
		});
	});

	describe('workflowReviews', () => {
		const originalWorkflowReviewsFlag = process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS;

		beforeEach(() => {
			process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
			testServer.license.enable('feat:workflowReviews');
			securitySettingsService.updateSecuritySettings.mockResolvedValue({});
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });
			workflowReviewPolicyService.set.mockResolvedValue({ enabled: true });
		});

		afterEach(() => {
			if (originalWorkflowReviewsFlag === undefined) {
				delete process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS;
			} else {
				process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = originalWorkflowReviewsFlag;
			}
		});

		it('GET should include workflowReviews when licensed and dev flag is on', async () => {
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });

			const response = await ownerAgent.get('/settings/security').expect(200);

			expect(response.body.data.workflowReviews).toEqual({ enabled: true });
		});

		it('POST should update workflowReviews and emit its policy event', async () => {
			const response = await ownerAgent
				.post('/settings/security')
				.send({ workflowReviews: { enabled: true } })
				.expect(200);

			expect(response.body.data).toEqual({ workflowReviews: { enabled: true } });
			expect(workflowReviewPolicyService.set).toHaveBeenCalledWith(true);
			expect(securitySettingsService.emitInstancePolicyUpdated).toHaveBeenCalledWith(
				expect.objectContaining({ id: expect.any(String) }),
				{ settingName: 'workflow_reviews', value: true },
			);
		});

		it('POST should reject workflowReviews when license is off', async () => {
			testServer.license.disable('feat:workflowReviews');

			await ownerAgent
				.post('/settings/security')
				.send({ workflowReviews: { enabled: true } })
				.expect(403);

			expect(workflowReviewPolicyService.set).not.toHaveBeenCalled();
		});
	});
});
