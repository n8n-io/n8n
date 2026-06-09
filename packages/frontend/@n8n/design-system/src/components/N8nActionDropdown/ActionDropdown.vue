<script setup lang="ts" generic="T extends string">
import { computed, getCurrentInstance, ref, useAttrs, useCssModule } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { ActionDropdownItem, IconSize, ButtonSize } from '../../types';
import N8nBadge from '../N8nBadge';
import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import N8nIcon from '../N8nIcon';
import { type IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton';
import { N8nKeyboardShortcut } from '../N8nKeyboardShortcut';

const { t } = useI18n();

const TRIGGER = ['click', 'hover'] as const;

defineOptions({ inheritAttrs: false });

interface ActionDropdownProps {
	items: Array<ActionDropdownItem<T>>;
	placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
	activatorIcon?: IconName;
	activatorSize?: ButtonSize;
	iconSize?: IconSize;
	trigger?: (typeof TRIGGER)[number];
	teleported?: boolean;
	disabled?: boolean;
	extraPopperClass?: string;
	maxHeight?: string | number;
	modal?: boolean;
}

const props = withDefaults(defineProps<ActionDropdownProps>(), {
	placement: 'bottom',
	activatorIcon: 'ellipsis',
	activatorSize: 'medium',
	iconSize: 'medium',
	trigger: 'click',
	teleported: true,
	disabled: false,
	maxHeight: '',
	modal: true,
});

const $style = useCssModule();
const attrs = useAttrs();

const dropdownTestId = computed(() => {
	const testId = attrs['data-test-id'];
	return typeof testId === 'string' ? testId : undefined;
});

const containerAttrs = computed(() => {
	const { 'data-test-id': _dataTestId, ...rest } = attrs;
	return rest;
});

const getItemTestId = (id: T): string => {
	if (dropdownTestId.value) {
		return `${dropdownTestId.value}-item-${id}`;
	}

	return `action-${id}`;
};

const items = computed((): Array<DropdownMenuItemProps<T, ActionDropdownItem<T>>> => {
	return props.items.map((item) => ({
		id: item.id,
		testId: item.testId ?? getItemTestId(item.id),
		label: item.label,
		icon: item.icon ? { type: 'icon' as const, value: item.icon } : undefined,
		disabled: item.disabled,
		divided: item.divided,
		class: getItemClasses(item),
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

const dropdownRef = ref<{ open: () => void; close: () => void } | null>(null);
const dropdownId = `n8n-action-dropdown-${getCurrentInstance()?.uid ?? 0}`;

const open = () => dropdownRef.value?.open();
const close = () => dropdownRef.value?.close();
defineExpose({ open, close });

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
	<div
		v-bind="containerAttrs"
		:class="['action-dropdown-container', $style.actionDropdownContainer]"
	>
		<N8nDropdownMenu
			:id="dropdownId"
			ref="dropdownRef"
			:items="items"
			:data-test-id="dropdownTestId"
			:content-test-id="dropdownTestId"
			:placement="placement"
			:trigger="trigger"
			:disabled="disabled"
			:teleported="teleported"
			:modal="modal"
			:extra-popper-class="`${extraPopperClass ?? ''}`"
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
					:disabled="disabled"
					:aria-label="t('actionDropdown.activator')"
					:aria-controls="dropdownId"
				/>
			</template>
			<template #item-leading="slotProps">
				<span
					v-if="slotProps.item.icon?.type === 'icon'"
					:class="[slotProps.ui.class, $style.icon]"
				>
					<N8nIcon :icon="slotProps.item.icon.value" :size="iconSize" />
				</span>
			</template>
			<template #item-label="slotProps">
				<span :class="[slotProps.ui.class, $style.label]">
					<slot name="menuItem" v-bind="slotProps.item.data as ActionDropdownItem<T>">
						{{ slotProps.item.data?.label ?? slotProps.item.label }}
					</slot>
				</span>
			</template>
			<template #item-trailing="slotProps">
				<span :class="slotProps.ui.class">
					<N8nIcon
						v-if="slotProps.item.data?.checked"
						:class="$style.checkIcon"
						icon="check"
						:size="iconSize"
					/>
					<span
						v-if="slotProps.item.data?.badge"
						:class="{ [$style.clickableBadge]: !!slotProps.item.data?.disabled }"
						@click.stop="slotProps.item.data?.disabled && onBadgeClick(slotProps.item.id)"
					>
						<N8nBadge theme="primary" size="xsmall" v-bind="slotProps.item.data.badgeProps">
							{{ slotProps.item.data.badge }}
						</N8nBadge>
					</span>
					<N8nKeyboardShortcut
						v-if="slotProps.item.data?.shortcut"
						v-bind="slotProps.item.data.shortcut"
						:class="$style.shortcut"
					/>
				</span>
			</template>
		</N8nDropdownMenu>
	</div>
</template>

<style lang="scss" module>
.actionDropdownContainer {
	display: inline-block;
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
