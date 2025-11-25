import type { Ref } from 'vue';
import { useUserRoleProvisioningStore } from './userRoleProvisioning.store';
import type { ProvisioningConfig } from '@n8n/rest-api-client/api/provisioning';
import { type UserRoleProvisioningSetting } from '../components/UserRoleProvisioningDropdown.vue';

/**
 * Composable for managing user role provisioning form logic in SSO settings.
 */
export function useUserRoleProvisioningForm(
	userRoleProvisioning: Ref<UserRoleProvisioningSetting>,
) {
	const provisioningStore = useUserRoleProvisioningStore();

	const getUserRoleProvisioningValueFromConfig = (
		config?: ProvisioningConfig,
	): UserRoleProvisioningSetting => {
		if (!config) {
			return 'disabled';
		}
		if (config.scopesProvisionInstanceRole && config.scopesProvisionProjectRoles) {
			return 'instance_and_project_roles';
		} else if (config.scopesProvisionInstanceRole) {
			return 'instance_role';
		} else {
			return 'disabled';
		}
	};

	const getProvisioningConfigFromFormValue = (
		formValue: UserRoleProvisioningSetting,
	): Pick<ProvisioningConfig, 'scopesProvisionInstanceRole' | 'scopesProvisionProjectRoles'> => {
		if (formValue === 'instance_role') {
			return {
				scopesProvisionInstanceRole: true,
				scopesProvisionProjectRoles: false,
			};
		} else if (formValue === 'instance_and_project_roles') {
			return {
				scopesProvisionInstanceRole: true,
				scopesProvisionProjectRoles: true,
			};
		} else {
			return {
				scopesProvisionInstanceRole: false,
				scopesProvisionProjectRoles: false,
			};
		}
	};

	const isUserRoleProvisioningChanged = (): boolean => {
		return (
			getUserRoleProvisioningValueFromConfig(provisioningStore.provisioningConfig) !==
			userRoleProvisioning.value
		);
	};

	/**
	 * Saves the current user role provisioning setting to the store.
	 */
	const saveProvisioningConfig = async (): Promise<void> => {
		await provisioningStore.saveProvisioningConfig(
			getProvisioningConfigFromFormValue(userRoleProvisioning.value),
		);
	};

	return {
		isUserRoleProvisioningChanged,
		saveProvisioningConfig,
	};
}
