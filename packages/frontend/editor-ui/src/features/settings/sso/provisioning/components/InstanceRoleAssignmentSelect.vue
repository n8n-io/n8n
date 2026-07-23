<script lang="ts" setup>
import { computed, ref } from 'vue';
import { BLOCK_ACCESS_ASSIGNMENT } from '@n8n/api-types';
import type { Role } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRolesStore } from '@/app/stores/roles.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { VIEWS } from '@/app/constants';
import {
	TOTAL_INSTANCE_PERMISSIONS,
	countGrantedInstancePermissions,
} from '@/features/roles/instance/instanceRoleScopes';
import RoleSelectDropdown from '@/features/roles/components/RoleSelectDropdown.vue';
import CustomRolesUpgradeModal from '@/features/roles/components/CustomRolesUpgradeModal.vue';

const { disabled = false, testId = 'instance-role-assignment-select' } = defineProps<{
	disabled?: boolean;
	testId?: string;
}>();

// The assigned instance role (or the Block access sentinel).
const modelValue = defineModel<string>({ required: true });

const i18n = useI18n();
const settingsStore = useSettingsStore();
const rolesStore = useRolesStore();

const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
const canManageRoles = computed(() => hasPermission(['rbac'], { rbac: { scope: 'role:manage' } }));

// Assignable instance roles (sorted, owner excluded).
const systemRoles = computed(() =>
	rolesStore.processedInstanceRoles.filter((role) => role.systemRole),
);
const customRoles = computed(() => rolesStore.customInstanceRoles);

const permissionCountFor = (role: Role) => countGrantedInstancePermissions(role.scopes ?? []);

// "Block access" is an access outcome, not a role, so it renders as a terminal
// option below the role groups rather than as one of them.
const blockAccessOption = computed(() => ({
	value: BLOCK_ACCESS_ASSIGNMENT,
	label: i18n.baseText('settings.sso.settings.roleMappingRules.blockAccess'),
}));

const upgradeModalVisible = ref(false);
</script>

<template>
	<span :class="$style.wrapper">
		<RoleSelectDropdown
			:system-roles="systemRoles"
			:custom-roles="customRoles"
			:current-role="modelValue"
			:has-custom-roles-license="hasCustomRolesLicense"
			:can-manage-roles="canManageRoles"
			:add-custom-role-route-name="VIEWS.INSTANCE_NEW_ROLE"
			:terminal-option="blockAccessOption"
			variant="default"
			:disabled="disabled"
			:permission-count-fn="permissionCountFor"
			:total-permissions="TOTAL_INSTANCE_PERMISSIONS"
			:edit-route-name="VIEWS.INSTANCE_ROLE_SETTINGS"
			:view-route-name="VIEWS.INSTANCE_ROLE_VIEW"
			:from-view="VIEWS.SSO_SETTINGS"
			:test-id="testId"
			@update:role="modelValue = $event"
			@system-role-upgrade-needed="upgradeModalVisible = true"
		/>
		<CustomRolesUpgradeModal v-model="upgradeModalVisible" />
	</span>
</template>

<style lang="scss" module>
.wrapper {
	display: inline-flex;
	min-width: 0;
}
</style>
