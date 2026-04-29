<script setup lang="ts" generic="T extends string">
import { computed, useCssModule } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { ActionDropdownItem, IconSize, ButtonSize } from '../../types';
import N8nBadge from '../N8nBadge';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';
import N8nIcon from '../N8nIcon';
import { type IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton';
import { N8nKeyboardShortcut } from '../N8nKeyboardShortcut';

const { t } = useI18n();

const TRIGGER = ['click', 'hover'] as const;

interface ActionDropdownProps {
	items: Array<ActionDropdownItem<T>>;
	placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
	activatorIcon?: IconName;
	activatorSize?: ButtonSize;
	iconSize?: IconSize;
	trigger?: (typeof TRIGGER)[number];
	hideArrow?: boolean;
	teleported?: boolean;
	disabled?: boolean;
	extraPopperClass?: string;
	maxHeight?: string | number;
}

const props = withDefaults(defineProps<ActionDropdownProps>(), {
	placement: 'bottom',
	activatorIcon: 'ellipsis',
	activatorSize: 'medium',
	iconSize: 'medium',
	trigger: 'click',
	hideArrow: false,
	teleported: true,
	disabled: false,
	maxHeight: '',
});

const $style = useCssModule();

const items = computed((): Array<DropdownMenuItemProps<T, ActionDropdownItem<T>>> => {
	return props.items.map((item) => ({
		id: item.id,
		label: item.label,
		icon: item.icon ? { type: 'icon' as const, value: item.icon as IconName } : undefined,
		disabled: item.disabled,
		divided: item.divided,
		checked: item.checked,
		data: item,
	}));
});

const emit = defineEmits<{
	select: [action: T];
	visibleChange: [open: boolean];
	'badge-click': [action: T];
}>();

const onSelect = (action: T) => emit('select', action);
const onOpenChange = (open: boolean) => emit('visibleChange', open);
const onBadgeClick = (action: T) => emit('badge-click', action);

const getItemClasses = (item: ActionDropdownItem<T>): Record<string, boolean> => {
	return {
		[$style.itemContainer]: true,
		[$style.disabled]: !!item.disabled,
		[$style.hasCustomStyling]: item.customClass !== undefined,
		...(item.customClass !== undefined ? { [item.customClass]: true } : {}),
	};
};
</script>

<template>
	<div :class="['action-dropdown-container', $style.actionDropdownContainer]">
		<N8nDropdownMenu
			:items="items"
			:placement="placement"
			:trigger="trigger"
			:disabled="disabled"
			:extra-popper-class="`${$style.shadow}${hideArrow ? ` ${$style.hideArrow}` : ''} ${extraPopperClass ?? ''}`"
			:max-height="maxHeight"
			@select="onSelect"
			@update:model-value="onOpenChange"
		>
			<template #trigger>
				<slot v-if="$slots.activator" name="activator" />
				<N8nIconButton
					v-else
					variant="ghost"
					:class="$style.activator"
					:size="activatorSize"
					:icon="activatorIcon"
					:aria-label="t('actionDropdown.activator')"
				/>
			</template>
			<template #item="slotProps">
				<div
					v-if="slotProps.item.data"
					:class="getItemClasses(slotProps.item.data as ActionDropdownItem<T>)"
					:data-test-id="`action-dropdown-item-${slotProps.item.id}`"
				>
					<span v-if="slotProps.item.icon" :class="$style.icon">
						<N8nIcon :icon="slotProps.item.icon.value as IconName" :size="iconSize" />
					</span>
					<span :class="$style.label">
						<slot name="menuItem" v-bind="slotProps.item.data">
							{{ slotProps.item.data.label }}
						</slot>
					</span>
					<N8nIcon
						v-if="slotProps.item.checked"
						:class="$style.checkIcon"
						icon="check"
						:size="iconSize"
					/>
					<span
						v-if="slotProps.item.data.badge"
						:class="{ [$style.clickableBadge]: slotProps.item.data.disabled }"
						@click.stop="slotProps.item.data.disabled && onBadgeClick(slotProps.item.id)"
					>
						<N8nBadge theme="primary" size="xsmall" v-bind="slotProps.item.data.badgeProps">
							{{ slotProps.item.data.badge }}
						</N8nBadge>
					</span>
					<N8nKeyboardShortcut
						v-if="slotProps.item.data.shortcut"
						v-bind="slotProps.item.data.shortcut"
						:class="$style.shortcut"
					/>
				</div>
			</template>
		</N8nDropdownMenu>
	</div>
</template>

<style lang="scss" module>
.actionDropdownContainer {
	display: inline-block;
}

.shadow {
	box-shadow: var(--shadow--light);
}

.hideArrow {
	:global(.el-popper__arrow) {
		display: none;
	}
}

.activator {
	&:hover {
		background-color: var(--color--background);
	}
}

.itemContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	justify-content: space-between;
	font-size: var(--font-size--2xs);
	line-height: 18px;
	padding: var(--spacing--3xs) var(--spacing--2xs);

	&.disabled {
		.shortcut {
			opacity: 0.3;
		}
	}

	:global([data-disabled]) & {
		color: inherit;
	}
}

.icon {
	display: flex;
	text-align: center;
	margin-right: var(--spacing--2xs);
	flex-grow: 0;
	flex-shrink: 0;

	svg {
		width: 1.2em !important;
	}
}

.label {
	flex-grow: 1;
	flex-shrink: 1;
}

.checkIcon {
	flex-grow: 0;
	flex-shrink: 0;
}

.shortcut {
	display: flex;
}

.clickableBadge {
	cursor: pointer;
	pointer-events: auto;
}
</style>
