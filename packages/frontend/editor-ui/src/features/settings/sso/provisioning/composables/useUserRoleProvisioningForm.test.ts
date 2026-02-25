import { createPinia, setActivePinia } from 'pinia';
import { useUserRoleProvisioningForm } from './useUserRoleProvisioningForm';
import * as provisioningApi from '@n8n/rest-api-client/api/provisioning';
import type { ProvisioningConfig } from '@n8n/rest-api-client/api/provisioning';

vi.mock('@n8n/rest-api-client/api/provisioning');
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
	});

	const mockProvisioningConfig = (config: Partial<ProvisioningConfig>) => {
		const defaultConfig: ProvisioningConfig = {
			scopesInstanceRoleClaimName: 'n8n_instance_role',
			scopesName: 'n8n',
			scopesProjectsRolesClaimName: 'n8n_projects',
			scopesProvisionInstanceRole: false,
			scopesProvisionProjectRoles: false,
		};
		return { ...defaultConfig, ...config };
	};

	describe('shouldPromptUserToConfirmUserRoleProvisioningChange', () => {
		it('should return false when disabling SSO', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);

			const { shouldPromptUserToConfirmUserRoleProvisioningChange } =
				useUserRoleProvisioningForm('oidc');

			const result = shouldPromptUserToConfirmUserRoleProvisioningChange({
				currentLoginEnabled: true,
				loginEnabledFormValue: false,
			});

			expect(result).toEqual(false);
		});

		it('should return false when enabling SSO without provisioning enabled', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: false }),
			);

			const { shouldPromptUserToConfirmUserRoleProvisioningChange } =
				useUserRoleProvisioningForm('oidc');

			const result = shouldPromptUserToConfirmUserRoleProvisioningChange({
				currentLoginEnabled: false,
				loginEnabledFormValue: true,
			});

			expect(result).toEqual(false);
		});

		it('should return true when enabling SSO with user role provisioning enabled', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);
			const { formValue, shouldPromptUserToConfirmUserRoleProvisioningChange } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

			const result = shouldPromptUserToConfirmUserRoleProvisioningChange({
				currentLoginEnabled: false,
				loginEnabledFormValue: true,
			});

			expect(result).toEqual(true);
		});

		it('should return true when changing provisioning setting while SSO is active', async () => {
			vi.mocked(provisioningApi.getProvisioningConfig).mockResolvedValue(
				mockProvisioningConfig({ scopesProvisionInstanceRole: true }),
			);
			const { formValue, shouldPromptUserToConfirmUserRoleProvisioningChange } =
				useUserRoleProvisioningForm('oidc');
			await vi.waitFor(() => expect(formValue.value).toBe('instance_role'));

			formValue.value = 'instance_and_project_roles';

			const result = shouldPromptUserToConfirmUserRoleProvisioningChange({
				currentLoginEnabled: true,
				loginEnabledFormValue: true,
			});

			expect(result).toEqual(true);
		});
	});
});
