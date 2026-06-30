<script lang="ts" setup>
import { ElRadio } from 'element-plus';
import { N8nActionDropdown, N8nIcon, N8nText, type ActionDropdownItem } from '@n8n/design-system';
import { ROLE, type UsersList } from '@n8n/api-types';
import type { Role } from '@n8n/permissions';
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRolesStore } from '@/app/stores/roles.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { VIEWS } from '@/app/constants';
import {
	TOTAL_INSTANCE_PERMISSIONS,
	countGrantedInstancePermissions,
} from '@/features/roles/instance/instanceRoleScopes';
import RoleSelectDropdown from '@/features/roles/components/RoleSelectDropdown.vue';
import CustomRolesUpgradeModal from '@/features/roles/components/CustomRolesUpgradeModal.vue';

const props = withDefaults(
	defineProps<{
		data: UsersList['items'][number];
		loading?: boolean;
	}>(),
	{ loading: false },
);

const emit = defineEmits<{
	'update:role': [payload: { role: string; userId: string }];
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();
const rolesStore = useRolesStore();
const usersStore = useUsersStore();
const { check: envFeatureFlagCheck } = useEnvFeatureFlag();

// Gates the new role-selection UX (custom roles + redesigned dropdown).
const customInstanceRolesEnabled = computed(() =>
	envFeatureFlagCheck.value('CUSTOM_INSTANCE_ROLES'),
);

const currentRole = computed<string>(() => props.data.role ?? ROLE.Default);
// Resolve the label against the full global list (incl. owner) so non-editable rows render.
const selectedRole = computed(() =>
	rolesStore.roles.global.find((role) => role.slug === currentRole.value),
);
const isEditable = computed(
	() => currentRole.value !== ROLE.Owner && currentRole.value !== ROLE.Default,
);

const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
const isAdminOrOwner = computed(() => usersStore.isAdminOrOwner);

// Assignable instance roles (sorted, owner excluded).
const assignableRoles = computed(() => rolesStore.processedInstanceRoles);
const systemRoles = computed(() => assignableRoles.value.filter((role) => role.systemRole));
const customRoles = computed(() => rolesStore.customInstanceRoles);

const permissionCountFor = (role: Role) => countGrantedInstancePermissions(role.scopes ?? []);

const upgradeModalVisible = ref(false);

const onRoleUpdate = (role: string) => {
	emit('update:role', { role, userId: props.data.id });
};

/* -------------------------------------------------------------------------- */
/* Legacy design (flag off): simple action dropdown with system roles only    */
/* -------------------------------------------------------------------------- */

const legacyRoleLabels = computed<Record<string, { label: string; desc: string }>>(() => ({
	[ROLE.Owner]: { label: i18n.baseText('auth.roles.owner'), desc: '' },
	[ROLE.Admin]: {
		label: i18n.baseText('auth.roles.admin'),
		desc: i18n.baseText('settings.users.table.row.role.description.admin'),
	},
	[ROLE.Member]: {
		label: i18n.baseText('auth.roles.member'),
		desc: i18n.baseText('settings.users.table.row.role.description.member'),
	},
	...(settingsStore.isChatFeatureEnabled && {
		[ROLE.ChatUser]: {
			label: i18n.baseText('auth.roles.chatUser'),
			desc: i18n.baseText('settings.users.table.row.role.description.chatUser'),
		},
	}),
	[ROLE.Default]: { label: i18n.baseText('auth.roles.default'), desc: '' },
}));

const legacyRoleLabel = computed(
	() => legacyRoleLabels.value[currentRole.value]?.label ?? selectedRole.value?.displayName,
);

const legacyRoleActions = computed<Array<ActionDropdownItem<string>>>(() => [
	{ id: ROLE.Member, label: i18n.baseText('auth.roles.member') },
	...(settingsStore.isChatFeatureEnabled
		? [{ id: ROLE.ChatUser, label: i18n.baseText('auth.roles.chatUser') }]
		: []),
	{ id: ROLE.Admin, label: i18n.baseText('auth.roles.admin') },
]);

const onLegacyActionSelect = (role: string) => {
	emit('update:role', { role, userId: props.data.id });
};
</script>

<template>
	<!-- New design (custom instance roles feature) -->
	<div v-if="customInstanceRolesEnabled" :class="$style.flagBranch">
		<RoleSelectDropdown
			v-if="isEditable"
			:system-roles="systemRoles"
			:custom-roles="customRoles"
			:current-role="currentRole"
			:has-custom-roles-license="hasCustomRolesLicense"
			:is-admin-or-owner="isAdminOrOwner"
			:add-custom-role-route-name="VIEWS.INSTANCE_NEW_ROLE"
			:loading="loading"
			:permission-count-fn="permissionCountFor"
			:total-permissions="TOTAL_INSTANCE_PERMISSIONS"
			:edit-route-name="VIEWS.INSTANCE_ROLE_SETTINGS"
			:view-route-name="VIEWS.INSTANCE_ROLE_VIEW"
			:from-view="VIEWS.USERS_SETTINGS"
			test-id="user-role-dropdown"
			@update:role="onRoleUpdate"
			@system-role-upgrade-needed="upgradeModalVisible = true"
		/>
		<span v-else>{{ selectedRole?.displayName }}</span>
		<CustomRolesUpgradeModal v-model="upgradeModalVisible" />
	</div>

	<!-- Legacy design -->
	<div v-else>
		<N8nActionDropdown
			v-if="isEditable"
			placement="bottom-start"
			:items="legacyRoleActions"
			:disabled="loading"
			data-test-id="user-role-dropdown"
			@select="onLegacyActionSelect"
		>
			<template #activator>
				<button :class="$style.roleLabel" type="button" :disabled="loading">
					<N8nText color="text-dark">{{ legacyRoleLabel }}</N8nText>
					<N8nIcon v-if="loading" color="text-dark" icon="spinner" spin size="large" />
					<N8nIcon v-else color="text-dark" icon="chevron-down" size="large" />
				</button>
			</template>
			<template #menuItem="item">
				<ElRadio :model-value="currentRole" :label="item.id">
					<span :class="$style.radioLabel">
						<N8nText color="text-dark" class="pb-3xs">{{ item.label }}</N8nText>
						<N8nText color="text-dark" size="small">
							{{ legacyRoleLabels[item.id]?.desc }}
						</N8nText>
					</span>
				</ElRadio>
			</template>
		</N8nActionDropdown>
		<span v-else>{{ legacyRoleLabel }}</span>
	</div>
</template>

<style lang="scss" module>
/* Wrapper for the feature-flag branch; renders as if it weren't there. */
.flagBranch {
	display: contents;
}

/* Legacy design */
.roleLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: transparent;
	padding: 0;
	border: none;
	cursor: pointer;

	&:disabled {
		cursor: default;
		opacity: 0.7;
	}
}

.radioLabel {
	max-width: 268px;
	display: inline-flex;
	flex-direction: column;
	padding: var(--spacing--2xs) 0;

	span {
		white-space: normal;
	}
}
</style>
