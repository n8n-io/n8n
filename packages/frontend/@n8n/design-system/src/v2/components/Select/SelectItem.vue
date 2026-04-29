<script setup lang="ts">
import { SelectItem, SelectItemIndicator, SelectItemText, type AcceptableValue } from 'reka-ui';
import { computed, useAttrs, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { SelectItemProps, SelectValue } from './Select.types';

defineOptions({ inheritAttrs: false });
const props = defineProps<SelectItemProps>();
const attrs = useAttrs();
const $style = useCssModule();

const forwardedProps = computed(() => {
	const {
		label: _label,
		type: _type,
		value: _value,
		disabled: _disabled,
		onSelect: _onSelect,
		icon: _icon,
		class: _class,
		strokeWidth: _strokeWidth,
		...rest
	} = props;

	return rest;
});

function isAcceptable(value?: SelectValue) {
	return value as AcceptableValue;
}

const leadingProps = computed(() => ({
	class: $style.itemLeading,
	strokeWidth: props.strokeWidth,
}));
const trailingProps = computed(() => ({
	class: $style.itemTrailing,
	strokeWidth: props.strokeWidth,
}));
</script>

<template>
	<SelectItem
		v-bind="{ ...forwardedProps, ...attrs }"
		:disabled="props.disabled"
		:value="isAcceptable(props.value)"
		:class="props.class"
		@select="props.onSelect?.($event)"
	>
		<slot name="item-leading" :item="props" :ui="leadingProps">
			<Icon v-if="props.icon" :icon="props.icon" v-bind="leadingProps" />
		</slot>

		<SelectItemText :class="$style.itemText">
			<slot name="item-label" :item="props">
				{{ props.label }}
			</slot>
		</SelectItemText>

		<slot name="item-trailing" :item="props" :ui="trailingProps" />
		<SelectItemIndicator as-child>
			<Icon icon="check" :class="$style.itemIndicator" />
		</SelectItemIndicator>
	</SelectItem>
</template>

<style module>
.itemLeading {
	flex-shrink: 0;
}

.itemText {
	flex-grow: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.itemIndicator,
.itemTrailing {
	margin-left: auto;
	flex-shrink: 0;
}
</style>
