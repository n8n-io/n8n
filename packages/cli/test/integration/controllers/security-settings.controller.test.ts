import { mockInstance } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';

import { EventService } from '@/events/event.service';
import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { N8N_ENV_FEAT_REDACTION_ENFORCEMENT } from '@/modules/redaction/redaction-enforcement.feature-flag';
import { SecuritySettingsService } from '@/services/security-settings.service';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('SecuritySettingsController', () => {
	const securitySettingsService = mockInstance(SecuritySettingsService);
	const instanceRedactionEnforcementService = mockInstance(InstanceRedactionEnforcementService);
	const eventService = mockInstance(EventService);
	const instanceSettingsLoaderConfig = mockInstance(InstanceSettingsLoaderConfig, {
		securityPolicyManagedByEnv: false,
	});

	const enableRedactionFlag = () => {
		process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT] = 'true';
	};
	const disableRedactionFlag = () => {
		delete process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT];
	};

	const testServer = setupTestServer({ endpointGroups: ['security-settings'] });
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		testServer.license.enable('feat:personalSpacePolicy');
		instanceSettingsLoaderConfig.securityPolicyManagedByEnv = false;
		disableRedactionFlag();
	});

	afterEach(() => {
		disableRedactionFlag();
	});

	describe('GET /settings/security', () => {
		it('should return 403 when personalSpacePolicy license is not active', async () => {
			testServer.license.disable('feat:personalSpacePolicy');
			await ownerAgent.get('/settings/security').expect(403);
		});

		it('should return security settings and all counts', async () => {
			securitySettingsService.arePersonalSpaceSettingsEnabled.mockResolvedValue({
				personalSpacePublishing: true,
				personalSpaceSharing: false,
			});
			securitySettingsService.getPublishedPersonalWorkflowsCount.mockResolvedValue(5);
			securitySettingsService.getSharedPersonalWorkflowsCount.mockResolvedValue(12);
			securitySettingsService.getSharedPersonalCredentialsCount.mockResolvedValue(3);

			const response = await ownerAgent.get('/settings/security').expect(200);

			expect(response.body).toEqual({
				data: {
					personalSpacePublishing: true,
					personalSpaceSharing: false,
					publishedPersonalWorkflowsCount: 5,
					sharedPersonalWorkflowsCount: 12,
					sharedPersonalCredentialsCount: 3,
					managedByEnv: false,
				},
			});
			expect(securitySettingsService.arePersonalSpaceSettingsEnabled).toHaveBeenCalledTimes(1);
			expect(securitySettingsService.getPublishedPersonalWorkflowsCount).toHaveBeenCalledTimes(1);
			expect(securitySettingsService.getSharedPersonalWorkflowsCount).toHaveBeenCalledTimes(1);
			expect(securitySettingsService.getSharedPersonalCredentialsCount).toHaveBeenCalledTimes(1);
		});

		it('should return 0 for all counts when no resources exist', async () => {
			securitySettingsService.arePersonalSpaceSettingsEnabled.mockResolvedValue({
				personalSpacePublishing: true,
				personalSpaceSharing: true,
			});
			securitySettingsService.getPublishedPersonalWorkflowsCount.mockResolvedValue(0);
			securitySettingsService.getSharedPersonalWorkflowsCount.mockResolvedValue(0);
			securitySettingsService.getSharedPersonalCredentialsCount.mockResolvedValue(0);

			const response = await ownerAgent.get('/settings/security').expect(200);

			expect(response.body.data.publishedPersonalWorkflowsCount).toBe(0);
			expect(response.body.data.sharedPersonalWorkflowsCount).toBe(0);
			expect(response.body.data.sharedPersonalCredentialsCount).toBe(0);
		});

		it('should handle service errors gracefully', async () => {
			securitySettingsService.arePersonalSpaceSettingsEnabled.mockRejectedValue(
				new Error('Database connection failed'),
			);

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

		it('should update only personalSpacePublishing when only that is set in body', async () => {
			securitySettingsService.setPersonalSpaceSetting.mockResolvedValue(undefined);

			const response = await ownerAgent
				.post('/settings/security')
				.send({ personalSpacePublishing: false })
				.expect(200);

			expect(response.body).toEqual({
				data: { personalSpacePublishing: false },
			});
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledTimes(1);
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				false,
			);
		});

		it('should update only personalSpaceSharing when only that is set in body', async () => {
			securitySettingsService.setPersonalSpaceSetting.mockResolvedValue(undefined);
			const response = await ownerAgent
				.post('/settings/security')
				.send({ personalSpaceSharing: true })
				.expect(200);

			expect(response.body).toEqual({
				data: { personalSpaceSharing: true },
			});
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledTimes(1);
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_SHARING_SETTING,
				true,
			);
		});

		it('should update both settings when both are set in body', async () => {
			securitySettingsService.setPersonalSpaceSetting.mockResolvedValue(undefined);

			const response = await ownerAgent
				.post('/settings/security')
				.send({ personalSpacePublishing: true, personalSpaceSharing: false })
				.expect(200);

			expect(response.body).toEqual({
				data: {
					personalSpacePublishing: true,
					personalSpaceSharing: false,
				},
			});
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledTimes(2);
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenNthCalledWith(
				1,
				PERSONAL_SPACE_PUBLISHING_SETTING,
				true,
			);
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenNthCalledWith(
				2,
				PERSONAL_SPACE_SHARING_SETTING,
				false,
			);
		});

		it('should call no service and return empty object when body has no settings', async () => {
			const response = await ownerAgent.post('/settings/security').send({}).expect(200);

			expect(response.body).toEqual({ data: {} });
			expect(securitySettingsService.setPersonalSpaceSetting).not.toHaveBeenCalled();
		});

		it('should handle service errors gracefully', async () => {
			securitySettingsService.setPersonalSpaceSetting.mockRejectedValue(
				new Error('Database connection failed'),
			);

			await ownerAgent
				.post('/settings/security')
				.send({ personalSpacePublishing: true })
				.expect(500);
		});
	});

	describe('when securityPolicyManagedByEnv is true', () => {
		beforeEach(() => {
			instanceSettingsLoaderConfig.securityPolicyManagedByEnv = true;
		});

		it('GET should return managedByEnv: true', async () => {
			securitySettingsService.arePersonalSpaceSettingsEnabled.mockResolvedValue({
				personalSpacePublishing: true,
				personalSpaceSharing: true,
			});
			securitySettingsService.getPublishedPersonalWorkflowsCount.mockResolvedValue(0);
			securitySettingsService.getSharedPersonalWorkflowsCount.mockResolvedValue(0);
			securitySettingsService.getSharedPersonalCredentialsCount.mockResolvedValue(0);

			const response = await ownerAgent.get('/settings/security').expect(200);

			expect(response.body.data.managedByEnv).toBe(true);
		});

		it('POST should return 403 when settings are managed by env', async () => {
			await ownerAgent
				.post('/settings/security')
				.send({ personalSpacePublishing: false })
				.expect(403);

			expect(securitySettingsService.setPersonalSpaceSetting).not.toHaveBeenCalled();
		});

		it('POST should return 403 when settings are managed by env, even for redactionEnforcement', async () => {
			enableRedactionFlag();
			await ownerAgent
				.post('/settings/security')
				.send({ redactionEnforcement: { floor: 'production' } })
				.expect(403);

			expect(instanceRedactionEnforcementService.set).not.toHaveBeenCalled();
		});
	});

	describe('redactionEnforcement', () => {
		beforeEach(() => {
			securitySettingsService.arePersonalSpaceSettingsEnabled.mockResolvedValue({
				personalSpacePublishing: true,
				personalSpaceSharing: true,
			});
			securitySettingsService.getPublishedPersonalWorkflowsCount.mockResolvedValue(0);
			securitySettingsService.getSharedPersonalWorkflowsCount.mockResolvedValue(0);
			securitySettingsService.getSharedPersonalCredentialsCount.mockResolvedValue(0);
		});

		describe('GET /settings/security', () => {
			it('should omit redactionEnforcement when feature flag is off', async () => {
				const response = await ownerAgent.get('/settings/security').expect(200);

				expect(response.body.data.redactionEnforcement).toBeUndefined();
				expect(instanceRedactionEnforcementService.get).not.toHaveBeenCalled();
			});

			it('should return redactionEnforcement.floor = "off" by default when flag is on', async () => {
				enableRedactionFlag();
				instanceRedactionEnforcementService.get.mockResolvedValue('off');

				const response = await ownerAgent.get('/settings/security').expect(200);

				expect(response.body.data.redactionEnforcement).toEqual({ floor: 'off' });
				expect(instanceRedactionEnforcementService.get).toHaveBeenCalledTimes(1);
			});

			it('should return stored floor = "production"', async () => {
				enableRedactionFlag();
				instanceRedactionEnforcementService.get.mockResolvedValue('production');

				const response = await ownerAgent.get('/settings/security').expect(200);

				expect(response.body.data.redactionEnforcement).toEqual({ floor: 'production' });
			});

			it('should return stored floor = "all"', async () => {
				enableRedactionFlag();
				instanceRedactionEnforcementService.get.mockResolvedValue('all');

				const response = await ownerAgent.get('/settings/security').expect(200);

				expect(response.body.data.redactionEnforcement).toEqual({ floor: 'all' });
			});
		});

		describe('POST /settings/security', () => {
			beforeEach(() => {
				instanceRedactionEnforcementService.get.mockResolvedValue('off');
			});

			it('should ignore redactionEnforcement when feature flag is off', async () => {
				const response = await ownerAgent
					.post('/settings/security')
					.send({ redactionEnforcement: { floor: 'production' } })
					.expect(200);

				expect(response.body).toEqual({ data: {} });
				expect(instanceRedactionEnforcementService.set).not.toHaveBeenCalled();
				expect(eventService.emit).not.toHaveBeenCalledWith(
					'redaction-enforcement-updated',
					expect.anything(),
				);
			});

			it('should persist redactionEnforcement.floor = "production" when flag is on', async () => {
				enableRedactionFlag();
				instanceRedactionEnforcementService.set.mockResolvedValue(undefined);

				const response = await ownerAgent
					.post('/settings/security')
					.send({ redactionEnforcement: { floor: 'production' } })
					.expect(200);

				expect(response.body).toEqual({
					data: { redactionEnforcement: { floor: 'production' } },
				});
				expect(instanceRedactionEnforcementService.set).toHaveBeenCalledTimes(1);
				expect(instanceRedactionEnforcementService.set).toHaveBeenCalledWith('production');
			});

			it('should persist redactionEnforcement.floor = "all" when flag is on', async () => {
				enableRedactionFlag();
				instanceRedactionEnforcementService.set.mockResolvedValue(undefined);

				await ownerAgent
					.post('/settings/security')
					.send({ redactionEnforcement: { floor: 'all' } })
					.expect(200);

				expect(instanceRedactionEnforcementService.set).toHaveBeenCalledWith('all');
			});

			it('should persist redactionEnforcement.floor = "off" when flag is on', async () => {
				enableRedactionFlag();
				instanceRedactionEnforcementService.get.mockResolvedValue('production');
				instanceRedactionEnforcementService.set.mockResolvedValue(undefined);

				await ownerAgent
					.post('/settings/security')
					.send({ redactionEnforcement: { floor: 'off' } })
					.expect(200);

				expect(instanceRedactionEnforcementService.set).toHaveBeenCalledWith('off');
			});

			it('should update personalSpace and redactionEnforcement together', async () => {
				enableRedactionFlag();
				securitySettingsService.setPersonalSpaceSetting.mockResolvedValue(undefined);
				instanceRedactionEnforcementService.set.mockResolvedValue(undefined);

				const response = await ownerAgent
					.post('/settings/security')
					.send({
						personalSpacePublishing: true,
						redactionEnforcement: { floor: 'production' },
					})
					.expect(200);

				expect(response.body).toEqual({
					data: {
						personalSpacePublishing: true,
						redactionEnforcement: { floor: 'production' },
					},
				});
				expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledTimes(1);
				expect(instanceRedactionEnforcementService.set).toHaveBeenCalledTimes(1);
			});

			it('should reject invalid floor values', async () => {
				enableRedactionFlag();

				await ownerAgent
					.post('/settings/security')
					.send({ redactionEnforcement: { floor: 'bogus' } })
					.expect(400);

				expect(instanceRedactionEnforcementService.set).not.toHaveBeenCalled();
			});

			describe('audit event emission', () => {
				it('should emit `redaction-enforcement-updated` with before/after when settings change', async () => {
					enableRedactionFlag();
					instanceRedactionEnforcementService.get.mockResolvedValue('off');
					instanceRedactionEnforcementService.set.mockResolvedValue(undefined);

					await ownerAgent
						.post('/settings/security')
						.send({ redactionEnforcement: { floor: 'production' } })
						.expect(200);

					expect(eventService.emit).toHaveBeenCalledWith(
						'redaction-enforcement-updated',
						expect.objectContaining({
							user: expect.objectContaining({ id: expect.any(String) }),
							before: 'off',
							after: 'production',
						}),
					);
				});

				it('should emit `redaction-enforcement-updated` with before/after when settings are disabled', async () => {
					enableRedactionFlag();
					instanceRedactionEnforcementService.get.mockResolvedValue('production');
					instanceRedactionEnforcementService.set.mockResolvedValue(undefined);

					await ownerAgent
						.post('/settings/security')
						.send({ redactionEnforcement: { floor: 'off' } })
						.expect(200);

					expect(eventService.emit).toHaveBeenCalledWith(
						'redaction-enforcement-updated',
						expect.objectContaining({
							user: expect.objectContaining({ id: expect.any(String) }),
							before: 'production',
							after: 'off',
						}),
					);
				});

				it('should not emit when save is idempotent', async () => {
					enableRedactionFlag();
					instanceRedactionEnforcementService.get.mockResolvedValue('production');
					instanceRedactionEnforcementService.set.mockResolvedValue(undefined);

					await ownerAgent
						.post('/settings/security')
						.send({ redactionEnforcement: { floor: 'production' } })
						.expect(200);

					expect(eventService.emit).not.toHaveBeenCalledWith(
						'redaction-enforcement-updated',
						expect.anything(),
					);
				});
			});
		});
	});
});
