<script setup lang="ts">
import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import { SelectItem, SelectItemIndicator, SelectItemText, type AcceptableValue } from 'reka-ui';
import { computed, useCssModule } from 'vue';

import type { SelectItemProps, SelectValue } from './Select.types';

defineOptions({ inheritAttrs: false });
const props = defineProps<SelectItemProps>();
const $style = useCssModule();

function isAcceptable(value?: SelectValue) {
	return value as AcceptableValue;
}

const leadingProps = computed(() => ({
	class: $style.ItemLeading,
	strokeWidth: props.strokeWidth,
}));
const trailingProps = computed(() => ({
	class: $style.ItemTrailing,
	strokeWidth: props.strokeWidth,
}));
</script>

<template>
	<SelectItem
		:disabled
		:value="isAcceptable(value)"
		:class="props.class"
		@select="onSelect?.($event)"
	>
		<slot name="item-leading" :item="props" :ui="leadingProps">
			<Icon v-if="icon" :icon="icon" v-bind="leadingProps" />
		</slot>

		<SelectItemText :class="$style.ItemText">
			<slot name="item-label" :item="props">
				{{ label }}
			</slot>
		</SelectItemText>

		<slot name="item-trailing" :item="props" :ui="trailingProps" />
		<SelectItemIndicator as-child>
			<Icon icon="check" :class="$style.ItemIndicator" />
		</SelectItemIndicator>
	</SelectItem>
</template>

<style module>
.ItemLeading {
	flex-shrink: 0;
}

.ItemText {
	flex-grow: 1;
}

.ItemIndicator,
.ItemTrailing {
	margin-left: auto;
	flex-shrink: 0;
}
</style>
