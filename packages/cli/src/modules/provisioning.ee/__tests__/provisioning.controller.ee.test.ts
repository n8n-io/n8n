import { type ProvisioningConfigDto } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { type AuthenticatedRequest } from '@n8n/db';
import { type Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { type ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';

import { ProvisioningController } from '../provisioning.controller.ee';

const provisioningService = mock<ProvisioningService>();
const licenseState = mock<LicenseState>();
const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
	ssoManagedByEnv: false,
});

const controller = new ProvisioningController(
	provisioningService,
	licenseState,
	instanceSettingsLoaderConfig,
);

describe('ProvisioningController', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getConfig', () => {
		const req = mock<AuthenticatedRequest>();
		const res = mock<Response>({
			json: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
		});

		it('should return 403 if provisioning is not licensed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(false);
			await controller.getConfig(req, res);

			expect(res.status).toHaveBeenCalledWith(403);
		});

		it('should return the provisioning config', async () => {
			const configResponse: ProvisioningConfigDto = {
				scopesProvisionInstanceRole: true,
				scopesProvisionProjectRoles: true,
				scopesName: 'n8n_test_scope',
				scopesInstanceRoleClaimName: 'n8n_test_instance_role',
				scopesProjectsRolesClaimName: 'n8n_test_projects_roles',
				scopesUseExpressionMapping: false,
			};

			licenseState.isProvisioningLicensed.mockReturnValue(true);
			provisioningService.getConfig.mockResolvedValue(configResponse);

			const config = await controller.getConfig(req, res);

			expect(config).toEqual(configResponse);
		});
	});

	describe('patchConfig', () => {
		const req = mock<AuthenticatedRequest>();
		const res = mock<Response>({
			json: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
		});

		it('should return 403 if provisioning is not licensed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(false);
			await controller.patchConfig(req, res);

			expect(res.status).toHaveBeenCalledWith(403);
		});

		it('should reject writes when managed by env', async () => {
			const envManagedConfig = mock<InstanceSettingsLoaderConfig>({ ssoManagedByEnv: true });
			const envManagedController = new ProvisioningController(
				provisioningService,
				licenseState,
				envManagedConfig,
			);

			licenseState.isProvisioningLicensed.mockReturnValue(true);

			await expect(envManagedController.patchConfig(req, res)).rejects.toThrow(
				'cannot be modified through the API',
			);
		});

		it('should patch the provisioning config', async () => {
			const configResponse: ProvisioningConfigDto = {
				scopesProvisionInstanceRole: false,
				scopesProvisionProjectRoles: false,
				scopesName: 'n8n_test_scope',
				scopesInstanceRoleClaimName: 'n8n_test_instance_role',
				scopesProjectsRolesClaimName: 'n8n_test_projects_roles',
				scopesUseExpressionMapping: false,
			};

			licenseState.isProvisioningLicensed.mockReturnValue(true);
			provisioningService.patchConfig.mockResolvedValue(configResponse);

			const config = await controller.patchConfig(req, res);

			expect(config).toEqual(configResponse);
		});
	});
});
