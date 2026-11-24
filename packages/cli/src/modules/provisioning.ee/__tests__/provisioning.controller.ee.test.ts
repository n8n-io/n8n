import { type ProvisioningConfigDto } from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { type AuthenticatedRequest, type User } from '@n8n/db';
import { type Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { type ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { type RoleMappingRuleService } from '@/modules/provisioning.ee/role-mapping-rule.service.ee';
import { getCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';

import { ProvisioningController } from '../provisioning.controller.ee';

vi.mock('@/sso.ee/sso-helpers', () => ({
	getCurrentAuthenticationMethod: vi.fn(() => 'saml'),
}));

const provisioningService = mock<ProvisioningService>();
const licenseState = mock<LicenseState>();
const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
	ssoManagedByEnv: false,
});
const roleMappingRuleService = mock<RoleMappingRuleService>();
const eventService = mock<EventService>();
const logger = mock<Logger>();

const controller = new ProvisioningController(
	provisioningService,
	licenseState,
	instanceSettingsLoaderConfig,
	roleMappingRuleService,
	eventService,
	logger,
);

const baseConfig: ProvisioningConfigDto = {
	scopesProvisionInstanceRole: false,
	scopesProvisionProjectRoles: false,
	scopesName: 'n8n_test_scope',
	scopesInstanceRoleClaimName: 'n8n_test_instance_role',
	scopesProjectsRolesClaimName: 'n8n_test_projects_roles',
	scopesUseExpressionMapping: false,
};

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
				...baseConfig,
				scopesProvisionInstanceRole: true,
				scopesProvisionProjectRoles: true,
			};

			licenseState.isProvisioningLicensed.mockReturnValue(true);
			provisioningService.getConfig.mockResolvedValue(configResponse);

			const config = await controller.getConfig(req, res);

			expect(config).toEqual(configResponse);
		});
	});

	describe('patchConfig', () => {
		const user = mock<User>({ id: 'user-1' });
		const req = mock<AuthenticatedRequest>({ user });
		const res = mock<Response>({
			json: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
		});

		beforeEach(() => {
			roleMappingRuleService.countByType.mockResolvedValue({ instance: 2, project: 1 });
		});

		it('should return 403 if provisioning is not licensed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(false);
			await controller.patchConfig(req, res);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('should reject writes when managed by env', async () => {
			const envManagedConfig = mock<InstanceSettingsLoaderConfig>({ ssoManagedByEnv: true });
			const envManagedController = new ProvisioningController(
				provisioningService,
				licenseState,
				envManagedConfig,
				roleMappingRuleService,
				eventService,
				logger,
			);

			licenseState.isProvisioningLicensed.mockReturnValue(true);

			await expect(envManagedController.patchConfig(req, res)).rejects.toThrow(
				'cannot be modified through the API',
			);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('should patch the provisioning config', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(true);
			provisioningService.patchConfig.mockResolvedValue(baseConfig);

			const config = await controller.patchConfig(req, res);

			expect(config).toEqual(baseConfig);
		});

		it('should report the save with the state after it', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(true);
			provisioningService.patchConfig.mockResolvedValue({
				...baseConfig,
				scopesProvisionInstanceRole: true,
				scopesProvisionProjectRoles: true,
			});

			await controller.patchConfig(req, res);

			expect(getCurrentAuthenticationMethod).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('provisioning-settings-updated', {
				user,
				authenticationMethod: 'saml',
				assignmentMethod: 'instance_and_project_roles',
				roleMappingMethod: 'idp_rule_mapping',
				instanceRuleCount: 2,
				projectRuleCount: 1,
			});
		});

		it('should count the rules only once the save has completed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(true);
			let completeSave!: (config: ProvisioningConfigDto) => void;
			provisioningService.patchConfig.mockReturnValue(
				new Promise<ProvisioningConfigDto>((resolve) => {
					completeSave = resolve;
				}),
			);

			const request = controller.patchConfig(req, res);
			await Promise.resolve();
			expect(provisioningService.patchConfig).toHaveBeenCalled();
			expect(roleMappingRuleService.countByType).not.toHaveBeenCalled();

			completeSave(baseConfig);
			await expect(request).resolves.toEqual(baseConfig);

			expect(roleMappingRuleService.countByType).toHaveBeenCalledOnce();
			expect(eventService.emit).toHaveBeenCalledOnce();
		});

		it('should return the saved config when the rule count fails', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(true);
			provisioningService.patchConfig.mockResolvedValue(baseConfig);
			const countError = new Error('db is gone');
			roleMappingRuleService.countByType.mockRejectedValue(countError);

			await expect(controller.patchConfig(req, res)).resolves.toEqual(baseConfig);

			expect(eventService.emit).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(expect.any(String), { error: countError });
		});

		it.each<[Partial<ProvisioningConfigDto>, number, string, string]>([
			[{}, 0, 'disabled', 'idp_rule_mapping'],
			[{ scopesProvisionInstanceRole: true }, 0, 'instance_role', 'idp_rule_mapping'],
			[
				{ scopesProvisionInstanceRole: true, scopesProvisionProjectRoles: true },
				0,
				'instance_and_project_roles',
				'idp_rule_mapping',
			],
			[{ scopesUseExpressionMapping: true }, 0, 'instance_role', 'n8n_rule_mapping'],
			[{ scopesUseExpressionMapping: true }, 3, 'instance_and_project_roles', 'n8n_rule_mapping'],
		])(
			'should report %o with %i project rules as %s / %s',
			async (flags, projectRuleCount, assignmentMethod, roleMappingMethod) => {
				licenseState.isProvisioningLicensed.mockReturnValue(true);
				provisioningService.patchConfig.mockResolvedValue({ ...baseConfig, ...flags });
				roleMappingRuleService.countByType.mockResolvedValue({
					instance: 1,
					project: projectRuleCount,
				});

				await controller.patchConfig(req, res);

				expect(eventService.emit).toHaveBeenCalledWith(
					'provisioning-settings-updated',
					expect.objectContaining({
						assignmentMethod,
						roleMappingMethod,
						instanceRuleCount: 1,
						projectRuleCount,
					}),
				);
			},
		);

		it('should not report a save that failed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(true);
			provisioningService.patchConfig.mockRejectedValue(new Error('invalid config'));

			await expect(controller.patchConfig(req, res)).rejects.toThrow('invalid config');

			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});
});
