import { createPinia, setActivePinia } from 'pinia';
import { useUserRoleProvisioningForm } from './useUserRoleProvisioningForm';
import * as provisioningApi from '@n8n/rest-api-client/api/provisioning';
import * as roleMappingRuleApi from '@n8n/rest-api-client/api/roleMappingRule';
import type { ProvisioningConfig } from '@n8n/rest-api-client/api/provisioning';
import type { RoleMappingRuleResponse } from '@n8n/rest-api-client/api/roleMappingRule';

vi.mock('@n8n/rest-api-client/api/provisioning');
vi.mock('@n8n/rest-api-client/api/roleMappingRule');
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: vi.fn(),
	}),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
		instanceId: 'test-instance-id',
	}),
}));

describe('useUserRoleProvisioningForm', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([]);
	});

	const mockProvisioningConfig = (config: Partial<ProvisioningConfig>) => {
		const defaultConfig: ProvisioningConfig = {
			scopesInstanceRoleClaimName: 'n8n_instance_role',
			scopesName: 'n8n',
			scopesProjectsRolesClaimName: 'n8n_projects',
			scopesProvisionInstanceRole: false,
			scopesProvisionProjectRoles: false,
			scopesUseExpressionMapping: false,
		};
		return { ...defaultConfig, ...config };
	};

	const mockProjectRule: RoleMappingRuleResponse = {
		id: 'rule-1',
		expression: '{{ $claims.groups.includes("devs") }}',
		role: 'project:editor',
		type: 'project',
		order: 0,
		projectIds: ['proj-1'],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const mockInstanceRule: RoleMappingRuleResponse = {
		id: 'rule-2',
		expression: '{{ $claims.groups.includes("admins") }}',
		role: 'global:admin',
		type: 'instance',
		order: 0,
		projectIds: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	describe('initFormValue — dropdown values from config', () => {
		it('should set manual when all flags are false', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);

			const { roleAssignment, mappingMethod } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('manual'));

			expect(mappingMethod.value).toBe('idp');
		});
		it('should set instance + idp when only scopesProvisionInstanceRole is true', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, mappingMethod } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			expect(mappingMethod.value).toBe('idp');
		});
		it('should set instance_and_project + idp when both scopes are true', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
				}),
			);

			const { roleAssignment, mappingMethod } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance_and_project'));

			expect(mappingMethod.value).toBe('idp');
		});
		it('should set instance + rules_in_n8n when expression mapping enabled and no project rules', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesUseExpressionMapping: true }),
			);
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([mockInstanceRule]);

			const { roleAssignment, mappingMethod } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			expect(mappingMethod.value).toBe('rules_in_n8n');
		});
		it('should set instance_and_project + rules_in_n8n when expression mapping enabled and project rules exist', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesUseExpressionMapping: true }),
			);
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				mockInstanceRule,
				mockProjectRule,
			]);

			const { roleAssignment, mappingMethod } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance_and_project'));

			expect(mappingMethod.value).toBe('rules_in_n8n');
		});
	});

	describe('saveProvisioningConfig — conversion to backend flags', () => {
		it('should save manual as all false', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);

			const { roleAssignment, mappingMethod, saveProvisioningConfig } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			roleAssignment.value = 'manual';
			mappingMethod.value = 'idp';
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					scopesProvisionInstanceRole: false,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: false,
				}),
			);
		});
		it('should save instance + idp with correct flags', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, mappingMethod, saveProvisioningConfig } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('manual'));

			roleAssignment.value = 'instance';
			mappingMethod.value = 'idp';
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: false,
				}),
			);
		});
		it('should save instance_and_project + idp with both scopes true', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
				}),
			);

			const { roleAssignment, mappingMethod, saveProvisioningConfig } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('manual'));

			roleAssignment.value = 'instance_and_project';
			mappingMethod.value = 'idp';
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
					scopesUseExpressionMapping: false,
				}),
			);
		});
		it('should save rules_in_n8n with expression flag and scopes false', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesUseExpressionMapping: true }),
			);

			const { roleAssignment, mappingMethod, saveProvisioningConfig } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('manual'));

			roleAssignment.value = 'instance_and_project';
			mappingMethod.value = 'rules_in_n8n';
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					scopesProvisionInstanceRole: false,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: true,
				}),
			);
		});
		it('should force manual when isDisablingSso is true', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);

			const { roleAssignment, saveProvisioningConfig } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			await saveProvisioningConfig(true);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					scopesProvisionInstanceRole: false,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: false,
				}),
			);
		});

		it('should skip save when nothing changed and effective assignment is instance_and_project', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
				}),
			);

			const { roleAssignment, saveProvisioningConfig } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance_and_project'));

			// Don't change anything — stored is instance_and_project, no cleanup needed
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).not.toHaveBeenCalled();
		});

		it('sends deleteProjectRules even when config is unchanged, to clean stale server-side project rules', async () => {
			// User is on 'instance_role' (instance + idp) and re-saves without changing anything.
			// storedHasProjectRules could be stale if the editor previously created project rules,
			// so the cleanup flag must still fire to guarantee the server matches the UI intent.
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, saveProvisioningConfig } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ deleteProjectRules: true }),
			);
		});
	});

	describe('roleAssignmentTransition', () => {
		it('should return none when dropdown has not changed', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, roleAssignmentTransition } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			expect(roleAssignmentTransition.value).toBe('none');
		});

		it('should return backup when changing from manual to SSO option', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);

			const { roleAssignment, roleAssignmentTransition } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('manual'));

			roleAssignment.value = 'instance';

			expect(roleAssignmentTransition.value).toBe('backup');
		});

		it('should return backup when changing between SSO options', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, roleAssignmentTransition } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			roleAssignment.value = 'instance_and_project';

			expect(roleAssignmentTransition.value).toBe('backup');
		});

		it('should return backup when changing mapping method', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, mappingMethod, roleAssignmentTransition } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			mappingMethod.value = 'rules_in_n8n';

			expect(roleAssignmentTransition.value).toBe('backup');
		});

		it('should return switchToManual when changing from SSO option to manual', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, roleAssignmentTransition } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			roleAssignment.value = 'manual';

			expect(roleAssignmentTransition.value).toBe('switchToManual');
		});
	});

	describe('revertRoleAssignment', () => {
		it('should reset dropdown to stored values', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, mappingMethod, revertRoleAssignment } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			roleAssignment.value = 'instance_and_project';
			mappingMethod.value = 'rules_in_n8n';

			revertRoleAssignment();

			expect(roleAssignment.value).toBe('instance');
			expect(mappingMethod.value).toBe('idp');
		});
	});

	describe('isDroppingProjectRules', () => {
		it('is true when pending a switch away from instance_and_project (IdP mapping)', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
				}),
			);

			const { roleAssignment, isDroppingProjectRules } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance_and_project'));

			expect(isDroppingProjectRules.value).toBe(false);

			roleAssignment.value = 'instance';

			expect(isDroppingProjectRules.value).toBe(true);
		});

		it('is true when pending a switch away from expression-based instance_and_project', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesUseExpressionMapping: true }),
			);
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				mockInstanceRule,
				mockProjectRule,
			]);

			const { roleAssignment, isDroppingProjectRules } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance_and_project'));

			expect(isDroppingProjectRules.value).toBe(false);

			roleAssignment.value = 'instance';

			expect(isDroppingProjectRules.value).toBe(true);
		});

		it('is false when there were never stored project rules', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, isDroppingProjectRules } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			roleAssignment.value = 'manual';

			expect(isDroppingProjectRules.value).toBe(false);
		});
	});

	describe('saveProvisioningConfig → deleteProjectRules payload', () => {
		it('adds deleteProjectRules when dropping instance_and_project (IdP mapping)', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
				}),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { roleAssignment, saveProvisioningConfig } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance_and_project'));

			roleAssignment.value = 'instance';
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: false,
					deleteProjectRules: true,
				}),
			);
		});

		it('adds deleteProjectRules when dropping expression-based project scope', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesUseExpressionMapping: true }),
			);
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				mockInstanceRule,
				mockProjectRule,
			]);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesUseExpressionMapping: true }),
			);

			const { roleAssignment, saveProvisioningConfig } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance_and_project'));

			roleAssignment.value = 'instance';
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ deleteProjectRules: true }),
			);
		});

		it('always sends deleteProjectRules when effective assignment is not instance_and_project', async () => {
			// Robustness guarantee: we can't trust storedHasProjectRules to be fresh
			// (editor saves can create project rules without touching the composable's
			// ref), so the cleanup flag always fires when the user isn't on
			// instance_and_project. Backend deleteAllOfType is idempotent.
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);

			const { roleAssignment, saveProvisioningConfig } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance'));

			roleAssignment.value = 'manual';
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ deleteProjectRules: true }),
			);
		});

		it('omits deleteProjectRules when effective assignment stays instance_and_project', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
				}),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
					scopesUseExpressionMapping: true,
				}),
			);

			const { roleAssignment, mappingMethod, saveProvisioningConfig } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance_and_project'));

			// Change only the mapping method, keep roleAssignment at instance_and_project
			mappingMethod.value = 'rules_in_n8n';
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledTimes(1);
			const payload = vi.mocked(provisioningApi.saveProvisioningConfig).mock.calls[0]?.[1] ?? {};
			expect(payload).not.toHaveProperty('deleteProjectRules');
		});

		it('adds deleteProjectRules when SSO is being disabled and stored state had project rules', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
				}),
			);
			vi.mocked(provisioningApi.saveProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);

			const { roleAssignment, saveProvisioningConfig } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(roleAssignment.value).toBe('instance_and_project'));

			await saveProvisioningConfig(true);

			expect(provisioningApi.saveProvisioningConfig).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					scopesProvisionInstanceRole: false,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: false,
					deleteProjectRules: true,
				}),
			);
		});
	});
});
