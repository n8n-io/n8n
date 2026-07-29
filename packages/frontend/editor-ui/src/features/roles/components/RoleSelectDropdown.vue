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
	SelectVariants,
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
		variant: 'ghost',
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

// Trigger label: a real role's name, or the terminal option's label when selected.
const selectedLabel = computed(() => {
	if (selectedRole.value) return selectedRole.value.displayName;
	if (props.terminalOption && props.currentRole === props.terminalOption.value) {
		return props.terminalOption.label;
	}
	return undefined;
});

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

const isUnavailableRoleItem = (item: SelectItemProps) => item.requiresUpgrade === true;
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
			:content-class="$style.roleSelectContent"
			:class="[$style.roleSelect, { [$style.roleSelectGhost]: variant === 'ghost' }]"
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
					<span
						:class="[$style.triggerContent, { [$style.triggerContentGhost]: variant === 'ghost' }]"
					>
						<span :class="[$style.triggerLabel, { [$style.placeholder]: !selectedLabel }]">{{
							selectedLabel ?? placeholder
						}}</span>
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
				<N8nSelect2Item v-else v-bind="item" :class="$style.selectItem" />
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
	max-width: 200px;
	overflow: hidden;
}

// The `ghost` variant is used inline in table cells (Users settings, Project
// members) where the trigger should look like plain text, not a boxed
// control — so its own padding/height are stripped. The bordered `default`
// variant (SSO provisioning) keeps the design system's normal sizing.
.roleSelectGhost {
	padding: 0;
	background-color: transparent;
	min-height: auto;

	&:not([data-disabled]):hover {
		background-color: transparent;
	}
}

.triggerContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	overflow: hidden;
}

// The `ghost` trigger sits inline as plain row text (Users settings, Project
// members), so its font size matches the surrounding row text rather than the
// button's own `size` — the bordered `default` variant inherits the trigger
// button's font size instead, matching sibling form controls.
.triggerContentGhost {
	font-size: var(--font-size--sm);
}

.triggerLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.placeholder {
	color: var(--color--text--tint-1);
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
