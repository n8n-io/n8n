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

export type RoleAssignmentTransitionType = 'none' | 'backup' | 'switchToManual';

type DropdownValues = {
	roleAssignment: RoleAssignmentSetting;
	mappingMethod: RoleMappingMethodSetting;
};
const DEFAULTS: DropdownValues = { roleAssignment: 'manual', mappingMethod: 'idp' };

function getDropdownValuesFromConfig(
	config?: ProvisioningConfig,
	hasProjectRules = false,
): DropdownValues {
	if (!config) return DEFAULTS;
	const mappingMethod: RoleMappingMethodSetting = config.scopesUseExpressionMapping
		? 'rules_in_n8n'
		: 'idp';
	if (config.scopesProvisionInstanceRole && config.scopesProvisionProjectRoles) {
		return { roleAssignment: 'instance_and_project', mappingMethod };
	} else if (config.scopesProvisionInstanceRole) {
		return { roleAssignment: 'instance', mappingMethod };
	} else if (config.scopesUseExpressionMapping) {
		return {
			roleAssignment: hasProjectRules ? 'instance_and_project' : 'instance',
			mappingMethod: 'rules_in_n8n',
		};
	}
	return DEFAULTS;
}

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

function toLegacyValue(
	roleAssignment: RoleAssignmentSetting,
	mappingMethod: RoleMappingMethodSetting,
): UserRoleProvisioningSetting {
	if (roleAssignment === 'manual') return 'disabled';
	if (mappingMethod === 'rules_in_n8n') return 'expression_based';
	if (roleAssignment === 'instance_and_project') return 'instance_and_project_roles';
	return 'instance_role';
}

function fromLegacyValue(value: UserRoleProvisioningSetting): DropdownValues {
	const map: Record<string, DropdownValues> = {
		instance_role: { roleAssignment: 'instance', mappingMethod: 'idp' },
		instance_and_project_roles: { roleAssignment: 'instance_and_project', mappingMethod: 'idp' },
		expression_based: { roleAssignment: 'instance', mappingMethod: 'rules_in_n8n' },
	};
	return map[value] ?? DEFAULTS;
}

export function useUserRoleProvisioningForm(protocol: SupportedProtocolType) {
	const provisioningStore = useUserRoleProvisioningStore();
	const telemetry = useTelemetry();

	const roleAssignment = ref<RoleAssignmentSetting>('manual');
	const mappingMethod = ref<RoleMappingMethodSetting>('idp');
	const storedHasProjectRules = ref(false);

	const storedValues = computed(() =>
		getDropdownValuesFromConfig(provisioningStore.provisioningConfig, storedHasProjectRules.value),
	);

	const formValue = computed<UserRoleProvisioningSetting>({
		get: () => toLegacyValue(roleAssignment.value, mappingMethod.value),
		set: (value: UserRoleProvisioningSetting) => {
			const values = fromLegacyValue(value);
			roleAssignment.value = values.roleAssignment;
			mappingMethod.value = values.mappingMethod;
		},
	});

	const isUserRoleProvisioningChanged = computed<boolean>(() => {
		const stored = storedValues.value;
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

	const saveProvisioningConfig = async (isDisablingSso: boolean): Promise<void> => {
		const effectiveRoleAssignment: RoleAssignmentSetting = isDisablingSso
			? 'manual'
			: roleAssignment.value;
		const effectiveMappingMethod: RoleMappingMethodSetting = isDisablingSso
			? 'idp'
			: mappingMethod.value;

		const stored = storedValues.value;
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

	const roleAssignmentTransition = computed<RoleAssignmentTransitionType>(() => {
		const stored = storedValues.value;
		if (
			stored.roleAssignment === roleAssignment.value &&
			stored.mappingMethod === mappingMethod.value
		) {
			return 'none';
		}
		if (roleAssignment.value === 'manual') {
			return 'switchToManual';
		}
		return 'backup';
	});

	const storedHasProjectRoles = computed(
		() => storedValues.value.roleAssignment === 'instance_and_project',
	);

	const revertRoleAssignment = () => {
		const stored = storedValues.value;
		roleAssignment.value = stored.roleAssignment;
		mappingMethod.value = stored.mappingMethod;
	};

	const initFormValue = () => {
		void provisioningStore.getProvisioningConfig().then(async () => {
			const config = provisioningStore.provisioningConfig;

			let hasProjectRules = false;
			if (config?.scopesUseExpressionMapping) {
				const api = useRoleMappingRulesApi();
				const rules = await api.listRules();
				hasProjectRules = rules.some((r) => r.type === 'project');
			}

			storedHasProjectRules.value = hasProjectRules;
			const values = getDropdownValuesFromConfig(config, hasProjectRules);
			roleAssignment.value = values.roleAssignment;
			mappingMethod.value = values.mappingMethod;
		});
	};

	initFormValue();

	return {
		roleAssignment,
		mappingMethod,
		formValue,
		isUserRoleProvisioningChanged,
		saveProvisioningConfig,
		roleAssignmentTransition,
		storedHasProjectRoles,
		revertRoleAssignment,
	};
}
