<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRolesStore } from '@/app/stores/roles.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { VIEWS } from '@/app/constants';
import RoleSelectDropdown from '@/features/roles/components/RoleSelectDropdown.vue';
import CustomRolesUpgradeModal from '@/features/roles/components/CustomRolesUpgradeModal.vue';

const { disabled = false, testId = 'project-role-assignment-select' } = defineProps<{
	disabled?: boolean;
	testId?: string;
}>();

const modelValue = defineModel<string>({ required: true });

const i18n = useI18n();
const settingsStore = useSettingsStore();
const rolesStore = useRolesStore();

const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
const canManageRoles = computed(() => hasPermission(['rbac'], { rbac: { scope: 'role:manage' } }));

// Assignable project roles (owner excluded via the store getter).
const systemRoles = computed(() =>
	rolesStore.processedProjectRoles.filter((role) => role.systemRole),
);
const customRoles = computed(() =>
	rolesStore.processedProjectRoles.filter((role) => !role.systemRole),
);

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
			:add-custom-role-route-name="VIEWS.PROJECT_NEW_ROLE"
			:placeholder="i18n.baseText('settings.sso.settings.roleMappingRules.selectRole')"
			variant="default"
			:disabled="disabled"
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
