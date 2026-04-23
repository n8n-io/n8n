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

	describe('formValue — legacy value derivation', () => {
		it('should return disabled when manual is selected', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);

			const { formValue } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('disabled'));
		});
		it('should return instance_role when instance + idp', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { formValue } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));
		});
		it('should return instance_and_project_roles when both scopes + idp', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
				}),
			);

			const { formValue } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_and_project_roles'));
		});
		it('should return expression_based when rules_in_n8n is selected', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesUseExpressionMapping: true }),
			);

			const { roleAssignment, mappingMethod, formValue } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(mappingMethod.value).toBe('rules_in_n8n'));

			// Regardless of roleAssignment, rules_in_n8n → expression_based
			expect(formValue.value).toBe('expression_based');

			roleAssignment.value = 'instance';
			expect(formValue.value).toBe('expression_based');
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

			const { roleAssignment, mappingMethod, formValue, saveProvisioningConfig } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

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

			const { roleAssignment, mappingMethod, formValue, saveProvisioningConfig } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('disabled'));

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

			const { roleAssignment, mappingMethod, formValue, saveProvisioningConfig } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('disabled'));

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

			const { roleAssignment, mappingMethod, formValue, saveProvisioningConfig } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('disabled'));

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

			const { formValue, saveProvisioningConfig } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

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

		it('should skip save when nothing changed', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { formValue, saveProvisioningConfig } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

			// Don't change anything
			await saveProvisioningConfig(false);

			expect(provisioningApi.saveProvisioningConfig).not.toHaveBeenCalled();
		});
	});

	describe('roleAssignmentTransition', () => {
		it('should return none when dropdown has not changed', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { formValue, roleAssignmentTransition } = useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

			expect(roleAssignmentTransition.value).toBe('none');
		});

		it('should return backup when changing from manual to SSO option', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({}),
			);

			const { formValue, roleAssignment, roleAssignmentTransition } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('disabled'));

			roleAssignment.value = 'instance';

			expect(roleAssignmentTransition.value).toBe('backup');
		});

		it('should return backup when changing between SSO options', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { formValue, roleAssignment, roleAssignmentTransition } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

			roleAssignment.value = 'instance_and_project';

			expect(roleAssignmentTransition.value).toBe('backup');
		});

		it('should return backup when changing mapping method', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { formValue, mappingMethod, roleAssignmentTransition } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

			mappingMethod.value = 'rules_in_n8n';

			expect(roleAssignmentTransition.value).toBe('backup');
		});

		it('should return switchToManual when changing from SSO option to manual', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { formValue, roleAssignment, roleAssignmentTransition } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

			roleAssignment.value = 'manual';

			expect(roleAssignmentTransition.value).toBe('switchToManual');
		});
	});

	describe('revertRoleAssignment', () => {
		it('should reset dropdown to stored values', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { formValue, roleAssignment, mappingMethod, revertRoleAssignment } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

			roleAssignment.value = 'instance_and_project';
			mappingMethod.value = 'rules_in_n8n';

			revertRoleAssignment();

			expect(roleAssignment.value).toBe('instance');
			expect(mappingMethod.value).toBe('idp');
		});
	});
});
