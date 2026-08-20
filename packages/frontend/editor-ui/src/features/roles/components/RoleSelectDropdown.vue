<script lang="ts" setup>
import { N8nBadge, N8nIcon, N8nSelect2, N8nText, N8nTooltip } from '@n8n/design-system';
import type { SelectItem, SelectOptionBase, SelectValue, SelectVariants } from '@n8n/design-system';
import type { Role } from '@n8n/permissions';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import RoleHoverPopover from './RoleHoverPopover.vue';
import RoleContactAdminModal from './RoleContactAdminModal.vue';
import CustomRolesUpgradeModal from './CustomRolesUpgradeModal.vue';

interface RoleSelectOption extends SelectOptionBase<string> {
	role: Role;
	requiresUpgrade?: boolean;
}

const isRoleSelectOption = (item: SelectOptionBase): item is RoleSelectOption =>
	'role' in item && item.role !== undefined;

const toRoleSelectOption = (role: Role): RoleSelectOption => ({
	value: role.slug,
	label: role.displayName,
	role,
	requiresUpgrade: !role.licensed,
});

const props = withDefaults(
	defineProps<{
		systemRoles: Role[];
		customRoles: Role[];
		currentRole: string;
		hasCustomRolesLicense: boolean;
		canManageRoles: boolean;
		addCustomRoleRouteName: string;
		loading?: boolean;
		disabled?: boolean;
		testId?: string;
		variant?: SelectVariants;
		// Shown in the trigger when no role is selected (e.g. an unset mapping rule).
		placeholder?: string;
		// Optional terminal (non-role) option rendered after a separator at the
		// bottom of the list, e.g. "Block access". Selecting it emits its value.
		terminalOption?: { value: string; label: string };
		// Optional RoleHoverPopover overrides — defaults to project-scoped values when omitted.
		permissionCountFn?: (role: Role) => number;
		totalPermissions?: number;
		editRouteName?: string;
		viewRouteName?: string;
		fromView?: string;
	}>(),
	{
		loading: false,
		disabled: false,
		testId: 'role-dropdown',
		variant: 'flush',
		placeholder: undefined,
		terminalOption: undefined,
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

watch(dropdownOpen, (open) => {
	if (!open) {
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

// Trigger label: a real role's name, or the terminal option's label when selected.
const selectedLabel = computed(() => {
	if (selectedRole.value) return selectedRole.value.displayName;
	if (props.terminalOption && props.currentRole === props.terminalOption.value) {
		return props.terminalOption.label;
	}
	return undefined;
});

const roleItems = computed<SelectItem[]>(() => {
	const items: SelectItem[] = [];

	if (props.systemRoles.length > 0) {
		items.push({
			type: 'group',
			label: i18n.baseText('projects.settings.role.selector.section.system'),
			items: props.systemRoles.map(toRoleSelectOption),
		});
	}

	if (props.customRoles.length > 0 || !props.hasCustomRolesLicense) {
		items.push({
			type: 'group',
			label: i18n.baseText('projects.settings.role.selector.section.custom'),
			items: props.customRoles.map(toRoleSelectOption),
		});
	}

	if (props.terminalOption) {
		if (items.length > 0) {
			items.push({ type: 'separator' });
		}
		items.push({ value: props.terminalOption.value, label: props.terminalOption.label });
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
	} else if (!props.canManageRoles) {
		contactAdminModalVisible.value = true;
	} else {
		void router.push({ name: props.addCustomRoleRouteName });
	}
};

const isUnavailableRoleItem = (item: SelectOptionBase) =>
	'requiresUpgrade' in item && item.requiresUpgrade === true;
</script>

<template>
	<div :class="$style.container">
		<N8nSelect2
			v-model:open="dropdownOpen"
			:items="roleItems"
			:model-value="currentRole"
			size="small"
			:variant="variant"
			:placeholder="placeholder"
			position="popper"
			:disabled="loading || disabled"
			:data-test-id="testId"
			@update:model-value="onRoleSelect"
		>
			<template #default>
				<N8nTooltip
					:content="selectedLabel"
					:disabled="!selectedLabel || dropdownOpen"
					placement="top"
					as-child
				>
					<span>
						{{ selectedLabel ?? placeholder }}
						<N8nIcon v-if="loading" icon="spinner" spin size="small" />
					</span>
				</N8nTooltip>
			</template>

			<template #item-label="{ item }">
				<RoleHoverPopover
					v-if="isRoleSelectOption(item)"
					:role="item.role"
					:permission-count="permissionCountFn ? permissionCountFn(item.role) : undefined"
					:total-permissions="totalPermissions"
					:edit-route-name="editRouteName"
					:view-route-name="viewRouteName"
					:from-view="fromView"
				>
					<N8nText
						tag="span"
						size="medium"
						:color="isUnavailableRoleItem(item) ? 'text-light' : 'text-dark'"
						:class="$style.itemLabel"
					>
						{{ item.label }}
					</N8nText>
				</RoleHoverPopover>
				<template v-else>
					{{ item.label }}
				</template>
			</template>

			<template #item-trailing="{ item, ui }">
				<N8nBadge
					v-if="isUnavailableRoleItem(item)"
					theme="warning"
					v-bind="ui"
					:class="$style.upgradeBadge"
				>
					{{ i18n.baseText('generic.upgrade') }}
				</N8nBadge>
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
	display: inline-flex;
	min-width: 0;
	overflow: hidden;
}

.itemLabel {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 180px;
}

.upgradeBadge {
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
	min-height: var(--height--xl);
	padding: 0 var(--spacing--xs);
	border: none;
	background: transparent;
	cursor: pointer;
	color: var(--color--primary);

	&:hover {
		background-color: var(--color--background--light-1);
	}
}
</style>
