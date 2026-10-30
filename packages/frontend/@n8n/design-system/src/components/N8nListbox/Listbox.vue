<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { computed, getCurrentInstance, ref, useAttrs } from 'vue';

import type { ListboxProps, ListboxSlots, ListboxValue } from './Listbox.types';
import { ListboxContent, ListboxRoot, useForwardProps } from './reka-ui';

defineOptions({ name: 'N8nListbox', inheritAttrs: false });

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

const props = withDefaults(defineProps<ListboxProps>(), {
	selectionBehavior: 'replace',
	orientation: 'vertical',
	disabled: false,
	highlightOnHover: true,
});

const emit = defineEmits<{
	'update:modelValue': [value: ListboxValue | undefined];
}>();

defineSlots<ListboxSlots>();

// vnode.props records a passed model, including when the value is undefined.
const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const isModelControlled = 'modelValue' in vnodeProps || 'model-value' in vnodeProps;
const internalValue = ref<ListboxValue | undefined>(props.defaultValue);
const rootModelValue = computed(() => (isModelControlled ? props.modelValue : internalValue.value));

function onModelUpdate(value: ListboxValue | undefined) {
	if (!isModelControlled) internalValue.value = value;
	emit('update:modelValue', value);
}

const rootProps = useForwardProps(
	reactivePick(props, 'disabled', 'orientation', 'dir', 'selectionBehavior', 'highlightOnHover'),
);
</script>

<template>
	<div :class="[$style.root, rootClass]" v-bind="rootAttrs">
		<ListboxRoot
			v-bind="rootProps"
			:model-value="rootModelValue"
			@update:model-value="onModelUpdate"
		>
			<ListboxContent as-child>
				<div :class="$style.content" :aria-label="label">
					<slot />
				</div>
			</ListboxContent>
		</ListboxRoot>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	min-width: 0;
}

// Reka's root is the only child. It has to pass the height through to the list.
.root > * {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	min-width: 0;
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	min-width: 0;
	outline: none;

	// Reka sets data-orientation. A horizontal list lays its items in a row.
	&[data-orientation='horizontal'] {
		flex-direction: row;
		flex-wrap: wrap;

		:global([role='option']) {
			width: auto;
			flex: none;
		}
	}
}
</style>
