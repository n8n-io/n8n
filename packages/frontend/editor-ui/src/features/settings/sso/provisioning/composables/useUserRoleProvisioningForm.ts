import { computed, ref } from 'vue';
import { useUserRoleProvisioningStore } from './userRoleProvisioning.store';
import type { ProvisioningConfig } from '@n8n/rest-api-client/api/provisioning';
import { useRoleMappingRulesApi } from './useRoleMappingRulesApi';
import type {
	RoleAssignmentSetting,
	RoleMappingMethodSetting,
} from '../components/UserRoleProvisioningDropdown.vue';
import { type SupportedProtocolType } from '../../sso.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { RoleMappingRulesSaveResult } from './useRoleMappingRules';

type TelemetryAssignmentMethod = 'disabled' | 'instance_role' | 'instance_and_project_roles';

type TelemetryRoleMappingMethod = 'idp_rule_mapping' | 'n8n_rule_mapping';

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

function getTelemetryAssignmentMethod(
	roleAssignment: RoleAssignmentSetting,
): TelemetryAssignmentMethod {
	if (roleAssignment === 'manual') return 'disabled';
	if (roleAssignment === 'instance_and_project') return 'instance_and_project_roles';
	return 'instance_role';
}

function getTelemetryRoleMappingMethod(
	mappingMethod: RoleMappingMethodSetting,
): TelemetryRoleMappingMethod {
	return mappingMethod === 'rules_in_n8n' ? 'n8n_rule_mapping' : 'idp_rule_mapping';
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

	const isUserRoleProvisioningChanged = computed<boolean>(() => {
		const stored = storedValues.value;
		return (
			stored.roleAssignment !== roleAssignment.value || stored.mappingMethod !== mappingMethod.value
		);
	});

	const trackProvisioningChange = (
		provisioningResult: { configChanged: boolean },
		ruleSaveResult: RoleMappingRulesSaveResult | undefined,
	) => {
		const rulesChanged =
			(ruleSaveResult?.createdCount ?? 0) > 0 || (ruleSaveResult?.deletedCount ?? 0) > 0;

		if (!provisioningResult.configChanged && !rulesChanged) return;

		telemetry.track('User updated provisioning settings', {
			instance_id: useRootStore().instanceId,
			authentication_method: protocol,
			assignment_method: getTelemetryAssignmentMethod(roleAssignment.value),
			role_mapping_method: getTelemetryRoleMappingMethod(mappingMethod.value),
			instance_rule_count: ruleSaveResult?.instanceRuleCount ?? 0,
			project_rule_count: ruleSaveResult?.projectRuleCount ?? 0,
		});
	};

	const saveProvisioningConfig = async (
		isDisablingSso: boolean,
	): Promise<{ configChanged: boolean }> => {
		const effectiveRoleAssignment: RoleAssignmentSetting = isDisablingSso
			? 'manual'
			: roleAssignment.value;
		const effectiveMappingMethod: RoleMappingMethodSetting = isDisablingSso
			? 'idp'
			: mappingMethod.value;

		// Whenever the effective assignment isn't 'instance_and_project', any project
		// mapping rules on the server are stale and must be cleaned up. We send this
		// flag even when the config appears unchanged because storedHasProjectRules
		// can be out of sync (e.g. rules were created via the editor after load).
		const shouldDeleteProjectRules = effectiveRoleAssignment !== 'instance_and_project';

		const stored = storedValues.value;
		const configChanged =
			effectiveRoleAssignment !== stored.roleAssignment ||
			effectiveMappingMethod !== stored.mappingMethod;

		if (!configChanged && !shouldDeleteProjectRules) {
			return { configChanged: false };
		}

		await provisioningStore.saveProvisioningConfig({
			...getProvisioningConfigFromDropdowns(effectiveRoleAssignment, effectiveMappingMethod),
			...(shouldDeleteProjectRules ? { deleteProjectRules: true } : {}),
		});

		roleAssignment.value = effectiveRoleAssignment;
		mappingMethod.value = effectiveMappingMethod;

		if (shouldDeleteProjectRules) {
			storedHasProjectRules.value = false;
		}

		// `shouldDeleteProjectRules` is enough to trigger a server call (to wipe
		// stale project rules) even when dropdown values haven't changed. The
		// caller relies on this flag to fire telemetry whenever a save actually
		// hit the backend.
		return { configChanged: configChanged || shouldDeleteProjectRules };
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

	const isDroppingProjectRules = computed(
		() =>
			storedValues.value.roleAssignment === 'instance_and_project' &&
			roleAssignment.value !== 'instance_and_project',
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
		isUserRoleProvisioningChanged,
		saveProvisioningConfig,
		trackProvisioningChange,
		roleAssignmentTransition,
		storedHasProjectRoles,
		isDroppingProjectRules,
		revertRoleAssignment,
	};
}
