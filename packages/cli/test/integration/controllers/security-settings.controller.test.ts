import { mockInstance } from '@n8n/backend-test-utils';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';

import { SecuritySettingsService } from '@/services/security-settings.service';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('SecuritySettingsController', () => {
	const securitySettingsService = mockInstance(SecuritySettingsService);

	const testServer = setupTestServer({ endpointGroups: ['security-settings'] });
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		testServer.license.enable('feat:personalSpacePolicy');
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
});
