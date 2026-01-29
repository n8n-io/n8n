<script lang="ts" setup>
import { N8nBadge, N8nIcon, N8nSelect2, N8nSelect2Item, N8nText } from '@n8n/design-system';
import type { AllRolesMap, Role } from '@n8n/permissions';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { ProjectMemberData } from '../projects.types';
import type {
	SelectItemProps,
	SelectValue,
} from '@n8n/design-system/v2/components/Select/Select.types';
import RoleHoverPopover from './RoleHoverPopover.vue';
import ProjectRoleContactAdminModal from './ProjectRoleContactAdminModal.vue';
import ProjectCustomRolesUpgradeModal from './ProjectCustomRolesUpgradeModal.vue';
import RoleDetailsModal from './RoleDetailsModal.vue';

interface RoleSelectItem extends SelectItemProps {
	role?: Role;
}

const props = defineProps<{
	data: ProjectMemberData;
	roles: AllRolesMap['project'];
}>();

const emit = defineEmits<{
	'update:role': [payload: { role: Role['slug']; userId: string }];
}>();

const i18n = useI18n();
const router = useRouter();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();

// Dropdown and modal visibility states
const dropdownOpen = ref(false);
const contactAdminModalVisible = ref(false);
const upgradeModalVisible = ref(false);
const roleDetailsModalVisible = ref(false);
const selectedRoleForDetails = ref<Role | null>(null);

const closeDropdown = () => {
	dropdownOpen.value = false;
	// Blur active element to remove focus ring
	if (document.activeElement instanceof HTMLElement) {
		document.activeElement.blur();
	}
};

const selectedRole = computed(() => props.roles.find((role) => role.slug === props.data.role));
const isEditable = computed(() => props.data.role !== 'project:personalOwner');

const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
const isAdminOrOwner = computed(() => usersStore.isInstanceOwner || usersStore.isAdmin);

const systemRoles = computed(() => props.roles.filter((role) => role.systemRole));
const customRoles = computed(() => props.roles.filter((role) => !role.systemRole));

// Build items for N8nSelect2 with section labels
const roleItems = computed<RoleSelectItem[]>(() => {
	const items: RoleSelectItem[] = [];

	// System roles section
	if (systemRoles.value.length > 0) {
		items.push({
			type: 'label',
			label: i18n.baseText('projects.settings.role.selector.section.system'),
		});
		systemRoles.value.forEach((role) => {
			items.push({
				value: role.slug,
				label: role.displayName,
				role,
			});
		});
	}

	// Custom roles section
	items.push({
		type: 'label',
		label: i18n.baseText('projects.settings.role.selector.section.custom'),
	});

	if (customRoles.value.length > 0) {
		customRoles.value.forEach((role) => {
			items.push({
				value: role.slug,
				label: role.displayName,
				disabled: !role.licensed,
				role,
			});
		});
	}

	return items;
});

const onRoleSelect = (value: SelectValue | undefined) => {
	if (!value || typeof value !== 'string') return;
	const role = props.roles.find((r) => r.slug === value);
	if (role && !role.licensed) {
		// Show upgrade modal for unlicensed roles
		closeDropdown();
		upgradeModalVisible.value = true;
		return;
	}

	emit('update:role', {
		role: value as Role['slug'],
		userId: props.data.id,
	});
};

const onAddCustomRoleClick = () => {
	closeDropdown();
	if (!hasCustomRolesLicense.value) {
		// No license - show upgrade modal
		upgradeModalVisible.value = true;
	} else if (!isAdminOrOwner.value) {
		// Has license but not admin - show contact admin modal
		contactAdminModalVisible.value = true;
	} else {
		// Admin with license - navigate to create role page
		void router.push({ name: VIEWS.PROJECT_NEW_ROLE });
	}
};

const onViewRoleDetails = (role: Role) => {
	closeDropdown();
	selectedRoleForDetails.value = role;
	roleDetailsModalVisible.value = true;
};
</script>

<template>
	<div v-if="isEditable" :class="$style.container">
		<N8nSelect2
			v-model:open="dropdownOpen"
			:items="roleItems"
			:model-value="data.role"
			size="small"
			variant="ghost"
			data-test-id="project-member-role-dropdown"
			@update:model-value="onRoleSelect"
		>
			<!-- Custom trigger to match original styling -->
			<template #default>
				<span :class="$style.triggerContent">
					{{ selectedRole?.displayName }}
				</span>
			</template>

			<!-- Custom item rendering with hover popover -->
			<template #item="{ item }">
				<template v-if="(item as RoleSelectItem).role">
					<RoleHoverPopover
						:role="(item as RoleSelectItem).role!"
						@view-details="onViewRoleDetails"
					>
						<N8nSelect2Item v-bind="item" :class="$style.selectItem">
							<template #item-label>
								<N8nText
									tag="span"
									size="small"
									:color="item.disabled ? 'text-light' : 'text-dark'"
								>
									{{ item.label }}
								</N8nText>
							</template>
							<template #item-trailing>
								<N8nBadge v-if="item.disabled" theme="warning" :class="$style.upgradeBadge">
									{{ i18n.baseText('generic.upgrade') }}
								</N8nBadge>
							</template>
						</N8nSelect2Item>
					</RoleHoverPopover>
				</template>
			</template>

			<!-- Section label with upgrade badge for custom roles -->
			<template #item-trailing="{ item }">
				<N8nBadge
					v-if="
						item.type === 'label' &&
						item.label === i18n.baseText('projects.settings.role.selector.section.custom') &&
						!hasCustomRolesLicense
					"
					theme="warning"
					:class="$style.sectionUpgradeBadge"
					@click.stop="
						closeDropdown();
						upgradeModalVisible = true;
					"
				>
					{{ i18n.baseText('generic.upgrade') }}
				</N8nBadge>
			</template>

			<!-- Footer with "+ Add custom role" link -->
			<template #footer>
				<button
					type="button"
					:class="$style.addCustomRoleButton"
					@click.stop="onAddCustomRoleClick"
				>
					<N8nIcon icon="plus" size="small" />
					<N8nText tag="span" size="small">
						{{ i18n.baseText('projects.settings.role.selector.addCustomRole') }}
					</N8nText>
				</button>
			</template>
		</N8nSelect2>

		<!-- Modals -->
		<ProjectRoleContactAdminModal
			v-model="contactAdminModalVisible"
			:custom-roles-exist="customRoles.length > 0"
		/>
		<ProjectCustomRolesUpgradeModal v-model="upgradeModalVisible" />
		<RoleDetailsModal v-model="roleDetailsModalVisible" :role="selectedRoleForDetails" />
	</div>
	<span v-else>{{ selectedRole?.displayName }}</span>
</template>

<style lang="scss" module>
.container {
	display: inline-block;
}

.triggerContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.selectItem {
	width: 100%;
}

.upgradeBadge {
	margin-left: auto;
	cursor: pointer;
}

.sectionUpgradeBadge {
	cursor: pointer;
}

.addCustomRoleButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--xs);
	border: none;
	border-top: var(--border);
	background: transparent;
	cursor: pointer;
	color: var(--color--primary);

	&:hover {
		background-color: var(--color--background--light-1);
	}
}
</style>
