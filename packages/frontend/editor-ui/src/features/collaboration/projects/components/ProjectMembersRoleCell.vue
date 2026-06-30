<script lang="ts" setup>
import type { AllRolesMap, Role } from '@n8n/permissions';
import { computed } from 'vue';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { ProjectMemberData } from '../projects.types';
import RoleSelectDropdown from '@/features/roles/components/RoleSelectDropdown.vue';

const props = defineProps<{
	data: ProjectMemberData;
	roles: AllRolesMap['project'];
}>();

const emit = defineEmits<{
	'update:role': [payload: { role: Role['slug']; userId: string }];
	'show-role-upgrade-dialog': [];
}>();

const settingsStore = useSettingsStore();
const usersStore = useUsersStore();

const selectedRole = computed(() => props.roles.find((role) => role.slug === props.data.role));
const isEditable = computed(() => props.data.role !== 'project:personalOwner');

const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
const isAdminOrOwner = computed(() => usersStore.isInstanceOwner || usersStore.isAdmin);

const systemRoles = computed(() => props.roles.filter((role) => role.systemRole));
const customRoles = computed(() => props.roles.filter((role) => !role.systemRole));

const onRoleUpdate = (role: string) => {
	emit('update:role', { role: role as Role['slug'], userId: props.data.id });
};
</script>

<template>
	<RoleSelectDropdown
		v-if="isEditable"
		:system-roles="systemRoles"
		:custom-roles="customRoles"
		:current-role="data.role"
		:has-custom-roles-license="hasCustomRolesLicense"
		:is-admin-or-owner="isAdminOrOwner"
		:add-custom-role-route-name="VIEWS.PROJECT_NEW_ROLE"
		test-id="project-member-role-dropdown"
		@update:role="onRoleUpdate"
		@system-role-upgrade-needed="emit('show-role-upgrade-dialog')"
	/>
	<span v-else>{{ selectedRole?.displayName }}</span>
</template>
