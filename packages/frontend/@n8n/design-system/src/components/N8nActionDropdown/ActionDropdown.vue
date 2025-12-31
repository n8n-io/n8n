<script lang="ts" setup>
// This component is visually similar to the ActionToggle component
// but it offers more options when it comes to dropdown items styling
// (supports icons, separators, custom styling and all options provided
// by Element UI dropdown component).
// It can be used in different parts of editor UI while ActionToggle
// is designed to be used in card components.
import { ElDropdown, ElDropdownMenu, ElDropdownItem, type Placement } from 'element-plus';
import { ref, useCssModule, useAttrs, computed } from 'vue';

import type { ActionDropdownItem, IconSize, ButtonSize } from '@n8n/design-system/types';

import N8nBadge from '../N8nBadge';
import N8nIcon from '../N8nIcon';
import { type IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton';
import { N8nKeyboardShortcut } from '../N8nKeyboardShortcut';

const TRIGGER = ['click', 'hover'] as const;

interface ActionDropdownProps {
	items: ActionDropdownItem[];
	placement?: Placement;
	activatorIcon?: IconName;
	activatorSize?: ButtonSize;
	iconSize?: IconSize;
	trigger?: (typeof TRIGGER)[number];
	hideArrow?: boolean;
	teleported?: boolean;
	disabled?: boolean;
	extraPopperClass?: string;
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
});

const attrs = useAttrs();
const testIdPrefix = attrs['data-test-id'];

const $style = useCssModule();
const getItemClasses = (item: ActionDropdownItem): Record<string, boolean> => {
	return {
		[$style.itemContainer]: true,
		[$style.disabled]: !!item.disabled,
		[$style.hasCustomStyling]: item.customClass !== undefined,
		...(item.customClass !== undefined ? { [item.customClass]: true } : {}),
	};
};

const emit = defineEmits<{
	select: [action: string];
	visibleChange: [open: boolean];
}>();

defineSlots<{
	activator: {};
	menuItem: (props: ActionDropdownItem) => void;
}>();

const elementDropdown = ref<InstanceType<typeof ElDropdown>>();

const popperClass = computed(
	() =>
		`${$style.shadow}${props.hideArrow ? ` ${$style.hideArrow}` : ''} ${props.extraPopperClass ?? ''}`,
);

const onSelect = (action: string) => emit('select', action);
const onVisibleChange = (open: boolean) => emit('visibleChange', open);

const onButtonBlur = (event: FocusEvent) => {
	// Hide dropdown when clicking outside of current document
	if (elementDropdown.value?.handleClose && event.relatedTarget === null) {
		elementDropdown.value.handleClose();
	}
};

const open = () => elementDropdown.value?.handleOpen();
const close = () => elementDropdown.value?.handleClose();
defineExpose({ open, close });
</script>

<template>
	<div :class="['action-dropdown-container', $style.actionDropdownContainer]">
		<ElDropdown
			ref="elementDropdown"
			:placement="placement"
			:trigger="trigger"
			:popper-class="popperClass"
			:teleported="teleported"
			:disabled="disabled"
			@command="onSelect"
			@visible-change="onVisibleChange"
		>
			<slot v-if="$slots.activator" name="activator" />
			<N8nIconButton
				v-else
				type="tertiary"
				text
				:class="$style.activator"
				:size="activatorSize"
				:icon="activatorIcon"
				@blur="onButtonBlur"
			/>

			<template #dropdown>
				<ElDropdownMenu :class="$style.userActionsMenu">
					<ElDropdownItem
						v-for="item in items"
						:key="item.id"
						:command="item.id"
						:disabled="item.disabled"
						:divided="item.divided"
						:class="$style.elementItem"
					>
						<div :class="getItemClasses(item)" :data-test-id="`${testIdPrefix}-item-${item.id}`">
							<span v-if="item.icon" :class="$style.icon">
								<N8nIcon :icon="item.icon" :size="iconSize" />
							</span>
							<span :class="$style.label">
								<slot name="menuItem" v-bind="item">
									{{ item.label }}
								</slot>
							</span>
							<N8nIcon
								v-if="item.checked"
								:class="$style.checkIcon"
								icon="check"
								:size="iconSize"
							/>
							<span v-if="item.badge">
								<N8nBadge theme="primary" size="xsmall" v-bind="item.badgeProps">
									{{ item.badge }}
								</N8nBadge>
							</span>
							<N8nKeyboardShortcut
								v-if="item.shortcut"
								v-bind="item.shortcut"
								:class="$style.shortcut"
							>
							</N8nKeyboardShortcut>
						</div>
					</ElDropdownItem>
				</ElDropdownMenu>
			</template>
		</ElDropdown>
	</div>
</template>

<style lang="scss" module>
:global(.el-dropdown__list) {
	.userActionsMenu {
		min-width: 160px;
		padding: var(--spacing-4xs) 0;
	}

	.elementItem {
		padding: 0;
	}
}

:global(.el-popper).hideArrow {
	:global(.el-popper__arrow) {
		display: none;
	}
}

.shadow {
	box-shadow: var(--box-shadow-light);
}

.activator {
	&:hover {
		background-color: var(--color-background-base);
	}
}

.itemContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	justify-content: space-between;
	font-size: var(--font-size-2xs);
	line-height: 18px;
	padding: var(--spacing-3xs) var(--spacing-2xs);

	&.disabled {
		.shortcut {
			opacity: 0.3;
		}
	}
}

.icon {
	text-align: center;
	margin-right: var(--spacing-2xs);

	svg {
		width: 1.2em !important;
	}
}

.checkIcon {
	flex-grow: 0;
	flex-shrink: 0;
}

.shortcut {
	display: flex;
}

:global(li.is-disabled) {
	.hasCustomStyling {
		color: inherit !important;
	}
}
</style>
