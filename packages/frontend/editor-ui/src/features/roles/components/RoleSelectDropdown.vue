<script lang="ts" setup>
import {
	N8nBadge,
	N8nIcon,
	N8nInput,
	N8nSelect2,
	N8nSelect2Item,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type {
	SelectItemProps,
	SelectValue,
} from '@n8n/design-system/v2/components/Select/Select.types';
import type { Role } from '@n8n/permissions';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import RoleHoverPopover from './RoleHoverPopover.vue';
import RoleContactAdminModal from './RoleContactAdminModal.vue';
import CustomRolesUpgradeModal from './CustomRolesUpgradeModal.vue';

interface RoleSelectItem extends SelectItemProps {
	role?: Role;
	requiresUpgrade?: boolean;
}

const props = withDefaults(
	defineProps<{
		systemRoles: Role[];
		customRoles: Role[];
		currentRole: string;
		hasCustomRolesLicense: boolean;
		isAdminOrOwner: boolean;
		addCustomRoleRouteName: string;
		loading?: boolean;
		testId?: string;
		// Optional RoleHoverPopover overrides — defaults to project-scoped values when omitted.
		permissionCountFn?: (role: Role) => number;
		totalPermissions?: number;
		editRouteName?: string;
		viewRouteName?: string;
		fromView?: string;
	}>(),
	{
		loading: false,
		testId: 'role-dropdown',
		permissionCountFn: undefined,
		totalPermissions: undefined,
		editRouteName: undefined,
		viewRouteName: undefined,
		fromView: undefined,
	},
);

const emit = defineEmits<{
	'update:role': [role: string];
	/** Emitted when the user selects an unlicensed system role. Parent decides how to surface the upgrade flow. */
	'system-role-upgrade-needed': [];
}>();

const i18n = useI18n();
const router = useRouter();
const telemetry = useTelemetry();

const dropdownOpen = ref(false);
const contactAdminModalVisible = ref(false);
const upgradeModalVisible = ref(false);
const searchQuery = ref('');

watch(dropdownOpen, (open) => {
	if (!open) {
		searchQuery.value = '';
		// Delay blur to run after Reka UI's internal focus management restores trigger focus
		setTimeout(() => {
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
		}, 0);
	}
});

const closeDropdown = () => {
	dropdownOpen.value = false;
};

const selectedRole = computed(() =>
	[...props.systemRoles, ...props.customRoles].find((role) => role.slug === props.currentRole),
);

const filteredSystemRoles = computed(() => {
	const query = searchQuery.value.toLowerCase().trim();
	if (!query) return props.systemRoles;
	return props.systemRoles.filter((role) => role.displayName.toLowerCase().includes(query));
});

const filteredCustomRoles = computed(() => {
	const query = searchQuery.value.toLowerCase().trim();
	if (!query) return props.customRoles;
	return props.customRoles.filter((role) => role.displayName.toLowerCase().includes(query));
});

const roleItems = computed<RoleSelectItem[]>(() => {
	const items: RoleSelectItem[] = [];

	if (filteredSystemRoles.value.length > 0) {
		items.push({
			type: 'label',
			label: i18n.baseText('projects.settings.role.selector.section.system'),
		});
		filteredSystemRoles.value.forEach((role) => {
			items.push({
				value: role.slug,
				label: role.displayName,
				role,
				requiresUpgrade: !role.licensed,
			});
		});
	}

	if (
		filteredCustomRoles.value.length > 0 ||
		(!searchQuery.value && !props.hasCustomRolesLicense)
	) {
		items.push({
			type: 'label',
			label: i18n.baseText('projects.settings.role.selector.section.custom'),
		});
		filteredCustomRoles.value.forEach((role) => {
			items.push({
				value: role.slug,
				label: role.displayName,
				role,
				requiresUpgrade: !role.licensed,
			});
		});
	}

	return items;
});

const onRoleSelect = (value: SelectValue | undefined) => {
	if (!value || typeof value !== 'string') return;
	const role = [...props.systemRoles, ...props.customRoles].find((r) => r.slug === value);
	if (role && !role.licensed) {
		closeDropdown();
		if (role.systemRole) {
			emit('system-role-upgrade-needed');
		} else {
			upgradeModalVisible.value = true;
		}
		return;
	}
	emit('update:role', value);
};

const onAddCustomRoleClick = () => {
	telemetry.track('User clicked add custom role from role selector');
	closeDropdown();
	if (!props.hasCustomRolesLicense) {
		upgradeModalVisible.value = true;
	} else if (!props.isAdminOrOwner) {
		contactAdminModalVisible.value = true;
	} else {
		void router.push({ name: props.addCustomRoleRouteName });
	}
};

const isUnavailableRoleItem = (item: SelectItemProps) => item.requiresUpgrade === true;
</script>

<template>
	<div :class="$style.container">
		<N8nSelect2
			v-model:open="dropdownOpen"
			:items="roleItems"
			:model-value="currentRole"
			size="small"
			variant="ghost"
			position="popper"
			:disabled="loading"
			:content-class="$style.roleSelectContent"
			:class="$style.roleSelect"
			:data-test-id="testId"
			@update:model-value="onRoleSelect"
		>
			<template #default>
				<N8nTooltip
					:content="selectedRole?.displayName"
					:disabled="!selectedRole || dropdownOpen"
					placement="top"
				>
					<span :class="$style.triggerContent">
						{{ selectedRole?.displayName }}
						<N8nIcon v-if="loading" icon="spinner" spin size="small" />
					</span>
				</N8nTooltip>
			</template>

			<template #header>
				<div :class="$style.searchContainer">
					<N8nInput
						v-model="searchQuery"
						:placeholder="i18n.baseText('generic.search')"
						size="medium"
						:class="$style.searchInput"
						@click.stop
						@keydown.stop
					/>
				</div>
			</template>

			<template #item="{ item }">
				<template v-if="(item as RoleSelectItem).role">
					<RoleHoverPopover
						:role="(item as RoleSelectItem).role!"
						:permission-count="
							permissionCountFn ? permissionCountFn((item as RoleSelectItem).role!) : undefined
						"
						:total-permissions="totalPermissions"
						:edit-route-name="editRouteName"
						:view-route-name="viewRouteName"
						:from-view="fromView"
					>
						<N8nSelect2Item v-bind="item" :class="$style.selectItem">
							<template #item-label>
								<N8nText
									tag="span"
									size="medium"
									:color="isUnavailableRoleItem(item) ? 'text-light' : 'text-dark'"
									:class="$style.itemLabel"
								>
									{{ item.label }}
								</N8nText>
							</template>
							<template #item-trailing>
								<N8nBadge
									v-if="isUnavailableRoleItem(item)"
									theme="warning"
									:class="$style.upgradeBadge"
								>
									{{ i18n.baseText('generic.upgrade') }}
								</N8nBadge>
							</template>
						</N8nSelect2Item>
					</RoleHoverPopover>
				</template>
			</template>

			<template #label="{ item }">
				<span :class="$style.sectionLabelContent">
					{{ item.label }}
					<N8nBadge
						v-if="
							item.label === i18n.baseText('projects.settings.role.selector.section.custom') &&
							!hasCustomRolesLicense
						"
						theme="default"
						:class="$style.sectionUpgradeBadge"
						@click.stop="
							closeDropdown();
							upgradeModalVisible = true;
						"
					>
						<N8nIcon icon="lock" size="xsmall" />
						{{ i18n.baseText('generic.upgrade') }}
					</N8nBadge>
				</span>
			</template>

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

		<RoleContactAdminModal
			v-model="contactAdminModalVisible"
			:custom-roles-exist="customRoles.length > 0"
		/>
		<CustomRolesUpgradeModal v-model="upgradeModalVisible" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: inline-block;
}

.searchContainer {
	border-bottom: var(--border);
}

.searchInput {
	width: 100%;
	--input--radius--bottom-right: 0;
	--input--radius--bottom-left: 0;
	--input--border-color: transparent;
	--input--border-color--hover: transparent;
}

.roleSelect {
	padding: 0;
	background-color: transparent;
	min-height: auto;
	max-width: 200px;

	&:not([data-disabled]):hover {
		background-color: transparent;
	}
}

.triggerContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 180px;
}

.itemLabel {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 180px;
}

.selectItem {
	display: flex;
	align-items: center;
	width: 100%;
	height: var(--spacing--xl);
}

.upgradeBadge {
	margin-left: auto;
	cursor: pointer;
}

.sectionLabelContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.sectionUpgradeBadge {
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
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

.roleSelectContent {
	max-width: 280px;
}
</style>
