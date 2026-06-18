<script setup lang="ts" generic="T extends string">
import { computed, getCurrentInstance, ref } from 'vue';

import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nLoading from '../N8nLoading';

type ActionToggleItem<T extends string> = {
	label: string;
	disabled?: boolean;
	type?: 'external-link';
} & ({ id: T; value?: T } | { id?: T; value: T });

interface ActionToggleProps {
	actions?: Array<ActionToggleItem<T>>;
	placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
	theme?: 'default' | 'dark';
	iconOrientation?: 'horizontal' | 'vertical';
	loading?: boolean;
	loadingRowCount?: number;
	disabled?: boolean;
	popperClass?: string;
	trigger?: 'click' | 'hover';
}

type ActionValue = T;

defineOptions({ name: 'N8nActionToggle' });
const props = withDefaults(defineProps<ActionToggleProps>(), {
	actions: () => [],
	placement: 'bottom',
	theme: 'default',
	iconOrientation: 'vertical',
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
		id: (action.id ?? action.value) as ActionValue,
		testId: `action-${String(action.id ?? action.value)}`,
		label: action.label,
		disabled: action.disabled,
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
			ref="dropdownRef"
			:id="dropdownId"
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
			<template #loading>
				<N8nLoading
					v-for="i in loadingRowCount"
					:key="i"
					:class="$style['loading-item']"
					animated
					variant="text"
				/>
			</template>
			<template #item-trailing="slotProps">
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

.loading-item {
	display: flex;
	width: 100%;
	min-width: var(--spacing--3xl);
}
</style>
