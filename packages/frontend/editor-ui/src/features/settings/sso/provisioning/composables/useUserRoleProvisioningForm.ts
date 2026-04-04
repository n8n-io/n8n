import { computed, ref } from 'vue';
import { useUserRoleProvisioningStore } from './userRoleProvisioning.store';
import type { ProvisioningConfig } from '@n8n/rest-api-client/api/provisioning';
import { useRoleMappingRulesApi } from './useRoleMappingRulesApi';
import type {
	RoleAssignmentSetting,
	RoleMappingMethodSetting,
	UserRoleProvisioningSetting,
} from '../components/UserRoleProvisioningDropdown.vue';
import { type SupportedProtocolType } from '../../sso.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';

/**
 * Derives the two dropdown values from the stored provisioning config.
 *
 * When expression mapping is active, both scopes booleans are false (mutually exclusive
 * code paths on the backend), so we can't distinguish "instance only" from "instance+project"
 * from config alone. We use `hasProjectRules` as a heuristic: if project-type rules exist
 * in the DB, the user intended "instance and project"; otherwise "instance only".
 */
function getDropdownValuesFromConfig(
	config?: ProvisioningConfig,
	hasProjectRules = false,
): {
	roleAssignment: RoleAssignmentSetting;
	mappingMethod: RoleMappingMethodSetting;
} {
	if (!config) {
		return { roleAssignment: 'manual', mappingMethod: 'idp' };
	}

	const mappingMethod: RoleMappingMethodSetting = config.scopesUseExpressionMapping
		? 'rules_in_n8n'
		: 'idp';

	if (config.scopesProvisionInstanceRole && config.scopesProvisionProjectRoles) {
		return { roleAssignment: 'instance_and_project', mappingMethod };
	} else if (config.scopesProvisionInstanceRole) {
		return { roleAssignment: 'instance', mappingMethod };
	} else if (config.scopesUseExpressionMapping) {
		// Expression mapping active — scopes booleans are both false.
		// Use presence of project rules to infer the intended role scope.
		return {
			roleAssignment: hasProjectRules ? 'instance_and_project' : 'instance',
			mappingMethod: 'rules_in_n8n',
		};
	}

	return { roleAssignment: 'manual', mappingMethod: 'idp' };
}

/**
 * Converts the two dropdown values into the provisioning config patch.
 */
function getProvisioningConfigFromDropdowns(
	roleAssignment: RoleAssignmentSetting,
	mappingMethod: RoleMappingMethodSetting,
): Pick<
	ProvisioningConfig,
	'scopesProvisionInstanceRole' | 'scopesProvisionProjectRoles' | 'scopesUseExpressionMapping'
> {
	if (roleAssignment === 'manual') {
		return {
			scopesProvisionInstanceRole: false,
			scopesProvisionProjectRoles: false,
			scopesUseExpressionMapping: false,
		};
	}

	const useExpressions = mappingMethod === 'rules_in_n8n';

	return {
		scopesProvisionInstanceRole: !useExpressions,
		scopesProvisionProjectRoles: !useExpressions && roleAssignment === 'instance_and_project',
		scopesUseExpressionMapping: useExpressions,
	};
}

/**
 * Derives the legacy single-value setting for telemetry and confirmation dialog.
 */
function toLegacyValue(
	roleAssignment: RoleAssignmentSetting,
	mappingMethod: RoleMappingMethodSetting,
): UserRoleProvisioningSetting {
	if (roleAssignment === 'manual') return 'disabled';
	if (mappingMethod === 'rules_in_n8n') return 'expression_based';
	if (roleAssignment === 'instance_and_project') return 'instance_and_project_roles';
	return 'instance_role';
}

/**
 * Composable for managing user role provisioning form logic in SSO settings.
 */
export function useUserRoleProvisioningForm(protocol: SupportedProtocolType) {
	const provisioningStore = useUserRoleProvisioningStore();
	const telemetry = useTelemetry();

	const roleAssignment = ref<RoleAssignmentSetting>('manual');
	const mappingMethod = ref<RoleMappingMethodSetting>('idp');

	/** Legacy single-value for backward compatibility. */
	const formValue = computed<UserRoleProvisioningSetting>(() =>
		toLegacyValue(roleAssignment.value, mappingMethod.value),
	);

	const isUserRoleProvisioningChanged = computed<boolean>(() => {
		const stored = getDropdownValuesFromConfig(provisioningStore.provisioningConfig);
		return (
			stored.roleAssignment !== roleAssignment.value || stored.mappingMethod !== mappingMethod.value
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
		const effectiveRoleAssignment: RoleAssignmentSetting = isDisablingSso
			? 'manual'
			: roleAssignment.value;
		const effectiveMappingMethod: RoleMappingMethodSetting = isDisablingSso
			? 'idp'
			: mappingMethod.value;

		const stored = getDropdownValuesFromConfig(provisioningStore.provisioningConfig);
		if (
			effectiveRoleAssignment === stored.roleAssignment &&
			effectiveMappingMethod === stored.mappingMethod
		) {
			return;
		}

		await provisioningStore.saveProvisioningConfig(
			getProvisioningConfigFromDropdowns(effectiveRoleAssignment, effectiveMappingMethod),
		);

		roleAssignment.value = effectiveRoleAssignment;
		mappingMethod.value = effectiveMappingMethod;

		sendTrackingEventForUserProvisioning(
			toLegacyValue(effectiveRoleAssignment, effectiveMappingMethod),
		);
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
		const api = useRoleMappingRulesApi();
		void Promise.all([provisioningStore.getProvisioningConfig(), api.listRules()]).then(
			([, rules]) => {
				const hasProjectRules = rules.some((r) => r.type === 'project');
				const values = getDropdownValuesFromConfig(
					provisioningStore.provisioningConfig,
					hasProjectRules,
				);
				roleAssignment.value = values.roleAssignment;
				mappingMethod.value = values.mappingMethod;
			},
		);
	};

	initFormValue();

	return {
		roleAssignment,
		mappingMethod,
		formValue,
		isUserRoleProvisioningChanged,
		saveProvisioningConfig,
		shouldPromptUserToConfirmUserRoleProvisioningChange,
	};
}
