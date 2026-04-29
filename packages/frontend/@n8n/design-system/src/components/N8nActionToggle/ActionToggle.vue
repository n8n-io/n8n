<script setup lang="ts" generic="T extends string">
import { computed, ref } from 'vue';

import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import N8nIconButton from '../N8nIconButton';
import N8nLoading from '../N8nLoading';

interface ActionToggleProps {
	actions?: Array<DropdownMenuItemProps<T>>;
	placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
	iconOrientation?: 'horizontal' | 'vertical';
	loading?: boolean;
	loadingRowCount?: number;
	disabled?: boolean;
	popperClass?: string;
	trigger?: 'click' | 'hover';
	closeOnParentScroll?: boolean;
}

type ActionValue = T;

defineOptions({ name: 'N8nActionToggle' });
const props = withDefaults(defineProps<ActionToggleProps>(), {
	actions: () => [],
	placement: 'bottom',
	iconOrientation: 'vertical',
	loading: false,
	loadingRowCount: 3,
	disabled: false,
	trigger: 'click',
	closeOnParentScroll: true,
});

const emit = defineEmits<{
	action: [value: ActionValue];
	'update:modelValue': [open: boolean];
	'item-mouseup': [action: DropdownMenuItemProps<T>];
}>();

const dropdownRef = ref<{ open: () => void; close: () => void } | null>(null);

const items = computed(() => props.actions);

const onAction = (value: T) => emit('action', value);
const onOpenChange = (open: boolean) => emit('update:modelValue', open);
const onItemMouseUp = (item: DropdownMenuItemProps<T>) => emit('item-mouseup', item);

const openActionToggle = (isOpen: boolean) => {
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
	<span class="action-toggle" :class="$style.container" data-test-id="action-toggle">
		<N8nDropdownMenu
			ref="dropdownRef"
			:items="items"
			:placement="placement"
			:disabled="disabled"
			:trigger="trigger"
			:loading="loading"
			:loading-item-count="loadingRowCount"
			:class="popperClass"
			@select="onAction"
			@update:model-value="onOpenChange"
			@item-mouseup="onItemMouseUp"
		>
			<template #trigger>
				<slot>
					<span :class="$style.trigger">
						<N8nIconButton
							variant="ghost"
							:icon="iconOrientation === 'horizontal' ? 'ellipsis' : 'ellipsis-vertical'"
							size="small"
						/>
					</span>
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
		background-color: var(--button--color--background-active);
		box-shadow:
			inset var(--button--border--shadow--active),
			var(--button--shadow--active);
	}
}

.loading-item {
	display: flex;
	width: 100%;
	min-width: var(--spacing--3xl);
}
</style>
