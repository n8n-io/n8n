<script setup lang="ts" generic="T extends string">
import { computed, getCurrentInstance, ref } from 'vue';

import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip';
import type { ActionToggleItem, ActionToggleProps } from './ActionToggle.types';

type ActionValue = T;

defineOptions({ name: 'N8nActionToggle' });
const props = withDefaults(defineProps<ActionToggleProps<T>>(), {
	actions: () => [],
	placement: 'bottom-end',
	theme: 'default',
	iconOrientation: 'horizontal',
	loading: false,
	loadingRowCount: 3,
	disabled: false,
	trigger: 'click',
});

const emit = defineEmits<{
	action: [value: ActionValue];
	'visible-change': [open: boolean];
	'update:modelValue': [open: boolean];
	'item-mouseup': [action: DropdownMenuItemProps<ActionValue, ActionToggleItem<T>>];
}>();

const dropdownRef = ref<{ open: () => void; close: () => void } | null>(null);
const dropdownId = `n8n-action-toggle-dropdown-${getCurrentInstance()?.uid ?? 0}`;

const items = computed((): Array<DropdownMenuItemProps<ActionValue, ActionToggleItem<T>>> => {
	return props.actions.map((action) => ({
		...action,
		id: (action.id ?? action.value) as ActionValue,
		testId: `action-${String(action.id ?? action.value)}`,
		data: action,
	}));
});

const onAction = (value: ActionValue) => emit('action', value);
const onOpenChange = (open: boolean) => {
	emit('visible-change', open);
	emit('update:modelValue', open);
};
const onItemMouseUp = (item: DropdownMenuItemProps<ActionValue, ActionToggleItem<T>>) => {
	const action =
		item.data ?? props.actions.find((candidate) => (candidate.id ?? candidate.value) === item.id);

	if (action) {
		emit('item-mouseup', item);
	}
	dropdownRef.value?.close();
};

const openActionToggle = (isOpen: boolean) => {
	if (props.disabled) {
		return;
	}

	if (isOpen) {
		dropdownRef.value?.open();
	} else {
		dropdownRef.value?.close();
	}
};

defineExpose({
	openActionToggle,
});
</script>

<template>
	<span
		class="action-toggle"
		:class="$style.container"
		data-test-id="action-toggle"
		@click.stop.prevent
	>
		<N8nDropdownMenu
			:id="dropdownId"
			ref="dropdownRef"
			:items="items"
			content-test-id="action-toggle-dropdown"
			:modal="false"
			:placement="placement"
			:disabled="disabled"
			:trigger="trigger"
			:loading="loading"
			:loading-item-count="loadingRowCount"
			:extra-popper-class="popperClass"
			@select="onAction"
			@update:model-value="onOpenChange"
			@item-mouseup="onItemMouseUp"
		>
			<template #trigger>
				<slot>
					<N8nIconButton
						variant="ghost"
						:class="$style[theme]"
						:icon="iconOrientation === 'horizontal' ? 'ellipsis' : 'ellipsis-vertical'"
						size="small"
						:disabled="disabled"
						role="button"
						:aria-controls="dropdownId"
					/>
				</slot>
			</template>
			<template #item-trailing="slotProps">
				<N8nTooltip
					v-if="slotProps.item.data?.tooltip"
					:content="slotProps.item.data.tooltip"
					placement="left"
				>
					<N8nIcon icon="info" size="xsmall" color="text-base" />
				</N8nTooltip>
				<N8nIcon
					v-if="slotProps.item.data?.type === 'external-link'"
					icon="external-link"
					size="xsmall"
					color="text-base"
				/>
			</template>
		</N8nDropdownMenu>
	</span>
</template>

<style lang="scss" module>
.container > * {
	line-height: 1;
}

.trigger {
	display: inline-flex;
	&[aria-expanded='true'] button {
		background-color: var(--background-active);
	}
}

.dark {
	color: var(--color--text--shade-1);

	&:focus {
		background-color: var(--color--background--light-3);
	}
}
</style>
