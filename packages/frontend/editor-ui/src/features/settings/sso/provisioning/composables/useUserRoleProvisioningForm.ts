import { computed, ref } from 'vue';
import { useUserRoleProvisioningStore } from './userRoleProvisioning.store';
import type { ProvisioningConfig } from '@n8n/rest-api-client/api/provisioning';
import { type UserRoleProvisioningSetting } from '../components/UserRoleProvisioningDropdown.vue';
import { type SupportedProtocolType } from '../../sso.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';

/**
 * Composable for managing user role provisioning form logic in SSO settings.
 */
export function useUserRoleProvisioningForm(protocol: SupportedProtocolType) {
	const provisioningStore = useUserRoleProvisioningStore();
	const telemetry = useTelemetry();
	const formValue = ref<UserRoleProvisioningSetting>('disabled');

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

	const isUserRoleProvisioningChanged = computed<boolean>(() => {
		return (
			getUserRoleProvisioningValueFromConfig(provisioningStore.provisioningConfig) !==
			formValue.value
		);
	});

	const sendTrackingEventForUserProvisioning = (updatedSetting: UserRoleProvisioningSetting) => {
		telemetry.track('User updated provisioning settings', {
			instance_id: useRootStore().instanceId,
			authentication_method: protocol,
			updated_setting: updatedSetting,
		});
	};

	/**
	 * Saves the current user role provisioning setting to the store.
	 */
	const saveProvisioningConfig = async (isDisablingSso: boolean): Promise<void> => {
		const newSetting: UserRoleProvisioningSetting = isDisablingSso ? 'disabled' : formValue.value;
		const currentValue = getUserRoleProvisioningValueFromConfig(
			provisioningStore.provisioningConfig,
		);

		if (newSetting === currentValue) {
			return;
		}

		await provisioningStore.saveProvisioningConfig(getProvisioningConfigFromFormValue(newSetting));
		formValue.value = newSetting;

		sendTrackingEventForUserProvisioning(newSetting);
	};

	const shouldPromptUserToConfirmUserRoleProvisioningChange = ({
		currentLoginEnabled,
		loginEnabledFormValue,
	}: { currentLoginEnabled: boolean; loginEnabledFormValue: boolean }) => {
		const isLoginEnabledChanged = currentLoginEnabled !== loginEnabledFormValue;
		const isEnablingSsoLogin = isLoginEnabledChanged && !currentLoginEnabled;
		const isDisablingSsoLogin = isLoginEnabledChanged && currentLoginEnabled;
		const isEnablingSsoAlongSideProvisioning = isEnablingSsoLogin && formValue.value !== 'disabled';
		const isChangingProvisioningSettingWhileLoginWasAlreadyEnabled =
			isUserRoleProvisioningChanged.value && currentLoginEnabled && !isDisablingSsoLogin;

		return (
			isEnablingSsoAlongSideProvisioning || isChangingProvisioningSettingWhileLoginWasAlreadyEnabled
		);
	};

	const initFormValue = () => {
		void provisioningStore.getProvisioningConfig().then(() => {
			formValue.value = getUserRoleProvisioningValueFromConfig(
				provisioningStore.provisioningConfig,
			);
		});
	};

	initFormValue();

	return {
		formValue,
		isUserRoleProvisioningChanged,
		saveProvisioningConfig,
		shouldPromptUserToConfirmUserRoleProvisioningChange,
	};
}
