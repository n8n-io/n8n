<script setup lang="ts" generic="T extends string">
import { computed, getCurrentInstance, ref, useAttrs, useCssModule } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { ActionDropdownItem } from '../../types';
import N8nBadge from '../N8nBadge';
import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import { N8nKeyboardShortcut } from '../N8nKeyboardShortcut';
import N8nText from '../N8nText';
import type { ActionDropdownProps } from './ActionDropdown.types';

const { t } = useI18n();

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ActionDropdownProps<T>>(), {
	placement: 'bottom',
	activatorIcon: 'ellipsis',
	activatorSize: 'medium',
	iconSize: 'large',
	trigger: 'click',
	teleported: true,
	disabled: false,
	maxHeight: '',
	modal: true,
	suppressCloseAutoFocus: false,
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

const toMenuItem = (
	item: ActionDropdownItem<T>,
): DropdownMenuItemProps<T, ActionDropdownItem<T>> => ({
	id: item.id,
	testId: item.testId ?? getItemTestId(item.id),
	label: item.label,
	icon: item.icon ? { type: 'icon' as const, value: item.icon } : undefined,
	iconSize: props.iconSize,
	disabled: item.disabled,
	divided: item.divided,
	checked: item.checked,
	destructive: item.variant === 'destructive',
	class: getItemClasses(item),
	data: item,
	children: item.children?.map(toMenuItem),
});

const items = computed((): Array<DropdownMenuItemProps<T, ActionDropdownItem<T>>> => {
	return props.items.map(toMenuItem);
});

const hasDescription = (item: ActionDropdownItem<T>): boolean =>
	!!item.description || !!item.children?.some(hasDescription);
const hasDescriptions = computed(() => props.items.some(hasDescription));

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
			:suppress-close-auto-focus="suppressCloseAutoFocus"
			:extra-popper-class="`${extraPopperClass ?? ''}`"
			:max-height="maxHeight"
			:width="width"
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
					:icon-size="activatorIconSize"
					:icon="activatorIcon"
					:disabled="disabled"
					:aria-label="t('actionDropdown.activator')"
					:aria-controls="dropdownId"
				/>
			</template>
			<template v-if="$slots.menuItem || hasDescriptions" #item-label="slotProps">
				<N8nText
					:class="slotProps.ui.class"
					size="medium"
					:color="slotProps.item.disabled ? 'text-xlight' : 'text-dark'"
				>
					<slot name="menuItem" v-bind="slotProps.item.data as ActionDropdownItem<T>">
						<span v-if="slotProps.item.data?.description" :class="$style.withDescription">
							{{ slotProps.item.data.label }}
							<span :class="$style.description">{{ slotProps.item.data.description }}</span>
						</span>
						<template v-else>{{ slotProps.item.data?.label ?? slotProps.item.label }}</template>
					</slot>
				</N8nText>
			</template>
			<template #item-trailing="slotProps">
				<span
					v-if="
						slotProps.item.data?.badge ||
						slotProps.item.data?.shortcut ||
						(slotProps.item.checked && slotProps.item.children?.length)
					"
					:class="slotProps.ui.class"
				>
					<!-- DropdownMenu renders checkmarks only for leaf items. -->
					<N8nIcon
						v-if="slotProps.item.checked && slotProps.item.children?.length"
						icon="check"
						:size="iconSize"
					/>
					<span
						v-if="slotProps.item.data?.badge"
						:class="{ [$style.clickableBadge]: !!slotProps.item.data?.disabled }"
						@click.stop="slotProps.item.data?.disabled && onBadgeClick(slotProps.item.id)"
					>
						<N8nBadge variant="primary" size="xsmall" v-bind="slotProps.item.data.badgeProps">
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
			<template v-if="$slots.footer" #footer>
				<slot name="footer" />
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
	&.disabled {
		.shortcut {
			opacity: 0.3;
		}
	}

	:global([data-disabled]) & {
		color: inherit;
	}
}

.withDescription {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	white-space: normal;
}

.description {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
}

.shortcut {
	display: flex;
}

.clickableBadge {
	cursor: pointer;
	pointer-events: auto;
}
</style>
